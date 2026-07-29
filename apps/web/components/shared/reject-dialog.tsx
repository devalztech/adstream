'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RejectDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * Used for both campaign rejection and website rejection/suspension —
 * the backend requires a `reason` string for all three (see
 * admin.schema.js), so this is one reusable dialog rather than three
 * near-identical ones.
 */
export function RejectDialog({ trigger, title, description, onConfirm }: RejectDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm(reason);
      setOpen(false);
      setReason('');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            className="mt-1.5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why, so the user understands what to fix…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={reason.trim().length < 3 || isPending}>
            {isPending ? 'Submitting…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
