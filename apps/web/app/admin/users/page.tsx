'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { adminApi } from '@/lib/api/admin';
import type { AdminUserRow, Role } from '@/types/api';

const LIMIT = 20;

export default function AdminUsersPage() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users', role, search, offset],
    queryFn: () =>
      adminApi.listUsers({ role: role === 'all' ? undefined : role, search: search || undefined, limit: LIMIT, offset }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const suspendMutation = useMutation({ mutationFn: (id: string) => adminApi.suspendUser(id), onSuccess: invalidate });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.reactivateUser(id),
    onSuccess: invalidate,
  });

  const columns: DataTableColumn<AdminUserRow>[] = [
    {
      header: 'User',
      cell: (u) => (
        <div>
          <p className="font-medium">{u.full_name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { header: 'Role', cell: (u) => <span className="capitalize">{u.role}</span> },
    {
      header: 'Status',
      cell: (u) =>
        u.is_locked ? (
          <Badge variant="destructive">Locked</Badge>
        ) : u.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="muted">Suspended</Badge>
        ),
    },
    { header: 'Joined', cell: (u) => new Date(u.created_at).toLocaleDateString() },
    {
      header: 'Actions',
      cell: (u) =>
        u.is_active ? (
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm">
                Suspend
              </Button>
            }
            title={`Suspend ${u.full_name}?`}
            description="They will be unable to log in until reactivated."
            variant="destructive"
            onConfirm={() => suspendMutation.mutateAsync(u.id)}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => reactivateMutation.mutate(u.id)}>
            Reactivate
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" description="Manage advertiser, publisher, and admin accounts." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as Role | 'all');
            setOffset(0);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="advertiser">Advertisers</SelectItem>
            <SelectItem value="publisher">Publishers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(u) => u.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filter."
        pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
      />
    </div>
  );
}
