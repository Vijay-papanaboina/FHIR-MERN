import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { usePortalMe } from "@/hooks/use-portal-me";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PortalGuard({ children }: { children: ReactNode }) {
  const { isPending, isError, error } = usePortalMe(true);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Account not yet linked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Account not yet linked — please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Unable to load portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We could not verify your portal access right now. Please refresh
              and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
