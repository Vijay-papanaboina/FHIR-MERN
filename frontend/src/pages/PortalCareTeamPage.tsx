import { UsersRound } from "lucide-react";
import { usePortalCareTeam } from "@/hooks/use-portal-care-team";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PortalCareTeamPage() {
  const { data, isPending, isError, error, refetch } = usePortalCareTeam(true);

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "Failed to load your care team"}
        onRetry={refetch}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No active care team assignments"
        subtitle="Your assigned practitioners will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Care Team</h1>
        <p className="text-muted-foreground">
          Your active assigned practitioners
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((member, idx) => (
          <Card key={`${member.name}-${idx}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Practitioner</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={member.image} alt={member.name} />
                <AvatarFallback>
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("") || "DR"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium">{member.name}</p>
                <Badge variant="outline" className="capitalize">
                  {member.assignmentRole}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
