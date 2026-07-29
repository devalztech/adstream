'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { websitesApi } from '@/lib/api/websites';
import { AD_FORMAT_OPTIONS } from '@/lib/constants/targeting';
import { ApiClientError } from '@/lib/api/errors';
import type { AdFormat } from '@/types/api';

export function AddAdUnitDialog({ websiteId }: { websiteId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<AdFormat>('responsive');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => websitesApi.createAdUnit(websiteId, { name, format }),
    onSuccess: () => {
      setOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['websites', websiteId] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not create this ad unit.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New ad unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create ad unit</DialogTitle>
          <DialogDescription>Choose a name and format for this placement.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="unit-name">Name</Label>
            <Input
              id="unit-name"
              className="mt-1.5"
              placeholder="e.g. Sidebar rectangle"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="unit-format">Format</Label>
            <select
              id="unit-format"
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value as AdFormat)}
            >
              {AD_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
