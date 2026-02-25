import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      {Icon && (
        <Icon className="mb-4 h-12 w-12 opacity-30" aria-hidden="true" />
      )}
      <p className="text-lg font-medium"> {title} </p>
      {subtitle && <p className="text-sm"> {subtitle} </p>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "An unexpected error occurred",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      role="alert"
    >
      <AlertCircle
        className="h-12 w-12 text-destructive opacity-60"
        aria-hidden="true"
      />
      <p className="font-medium text-destructive"> {message} </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
