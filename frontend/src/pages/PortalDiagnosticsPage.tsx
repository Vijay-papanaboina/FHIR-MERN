import { Fragment, useState } from "react";
import { FlaskConical } from "lucide-react";
import { usePortalDiagnostics } from "@/hooks/use-portal-diagnostics";
import { usePortalDiagnosticResults } from "@/hooks/use-portal-diagnostic-results";
import { formatDate } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PortalDiagnosticsPage() {
  const { data, isPending, isError, error, refetch } =
    usePortalDiagnostics(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const {
    data: results,
    isPending: resultsLoading,
    isError: resultsError,
    error: resultsErrorValue,
    refetch: refetchResults,
  } = usePortalDiagnosticResults(expandedReportId ?? "", !!expandedReportId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Diagnostics</h1>
        <p className="text-muted-foreground">
          Finalized diagnostic reports and linked lab results.
        </p>
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load your diagnostics"}
          onRetry={refetch}
        />
      )}

      {!isPending && !isError && data && data.length === 0 && (
        <EmptyState
          icon={FlaskConical}
          title="No diagnostics"
          subtitle="No finalized diagnostic reports are available yet."
        />
      )}

      {!isPending && !isError && data && data.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((report) => {
                const expanded = expandedReportId === report.id;
                return (
                  <Fragment key={report.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        {report.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(report.issued)}</TableCell>
                      <TableCell>
                        {report.resultObservationIds.length}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExpandedReportId((current) =>
                              current === report.id ? null : report.id,
                            );
                          }}
                        >
                          {expanded ? "Hide" : "View"} results
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30">
                          {resultsLoading && (
                            <div className="space-y-2 p-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                              ))}
                            </div>
                          )}

                          {resultsError && (
                            <ErrorState
                              message={
                                resultsErrorValue instanceof Error
                                  ? resultsErrorValue.message
                                  : "Failed to load diagnostic results"
                              }
                              onRetry={() => {
                                void refetchResults();
                              }}
                            />
                          )}

                          {!resultsLoading && !resultsError && results && (
                            <>
                              {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No linked observations found for this report.
                                </p>
                              ) : (
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Interpretation</TableHead>
                                        <TableHead>Recorded</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {results.map((result) => (
                                        <TableRow key={result.id}>
                                          <TableCell className="font-medium">
                                            {result.code}
                                          </TableCell>
                                          <TableCell>
                                            {result.value ?? "—"}
                                          </TableCell>
                                          <TableCell>
                                            {result.interpretation || "—"}
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(result.recordedAt)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
