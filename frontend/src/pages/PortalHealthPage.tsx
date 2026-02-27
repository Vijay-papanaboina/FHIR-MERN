import { UserRound } from "lucide-react";
import { usePortalMe } from "@/hooks/use-portal-me";
import { formatDate } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PortalHealthPage() {
  const { data: me, isPending, isError, error, refetch } = usePortalMe(true);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "Failed to load your demographics"}
        onRetry={refetch}
      />
    );
  }

  if (!me) {
    return (
      <EmptyState
        icon={UserRound}
        title="No demographics found"
        subtitle="Your profile could not be loaded."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Name: </span>
          <span className="font-medium">{me.displayName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Date of Birth: </span>
          <span className="font-medium">{formatDate(me.birthDate)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Gender: </span>
          <span className="font-medium capitalize">{me.gender}</span>
        </div>
      </CardContent>
    </Card>
  );
}
