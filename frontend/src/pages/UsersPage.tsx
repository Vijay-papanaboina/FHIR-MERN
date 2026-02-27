import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Admin user management is implemented in a later task.
        </p>
      </CardContent>
    </Card>
  );
}
