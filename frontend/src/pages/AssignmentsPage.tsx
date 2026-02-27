import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssignmentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Admin assignment management is implemented in a later task.
        </p>
      </CardContent>
    </Card>
  );
}
