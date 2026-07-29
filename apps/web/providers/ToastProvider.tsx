'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'error';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-card text-card-foreground',
  success: 'border-success/30 bg-success/10 text-foreground',
  error: 'border-destructive/30 bg-destructive/10 text-foreground',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant: 'default', ...input }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={5000}
            onOpenChange={(open) => !open && remove(t.id)}
            className={cn(
              'grid grid-cols-[1fr_auto] items-start gap-2 rounded-md border p-4 shadow-md',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
              variantStyles[t.variant]
            )}
          >
            <div>
              <ToastPrimitive.Title className="text-sm font-medium">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="rounded p-1 hover:bg-accent">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] m-4 flex w-full max-w-sm flex-col gap-2" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
