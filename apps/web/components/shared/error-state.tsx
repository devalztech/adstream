import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Standard failed-to-load state. Never shows a raw backend stack trace
 * or error object — `message` should already be the user-safe string
 * from ApiClientError.message (the backend never sends internals in
 * production; see the backend's errorHandler.js).
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 py-16 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-6">
          Try again
        </Button>
      )}
    </div>
  );
}
