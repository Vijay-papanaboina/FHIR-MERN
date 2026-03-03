import { Fragment, useState } from "react";
import { FlaskConical } from "lucide-react";
import type { DiagnosticReportDTO } from "@fhir-mern/shared";
import { useDiagnosticResults } from "@/hooks/use-diagnostics";
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

interface PatientDiagnosticsTabProps {
  patientId: string;
  diagnostics: DiagnosticReportDTO[] | undefined;
  diagnosticsLoading: boolean;
  diagnosticsError: boolean;
  onRetry: () => void;
}

export function PatientDiagnosticsTab({
  patientId,
  diagnostics,
  diagnosticsLoading,
  diagnosticsError,
  onRetry,
}: PatientDiagnosticsTabProps) {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const {
    data: results,
    isPending: resultsLoading,
    isError: resultsError,
    error: resultsErrorValue,
    refetch: refetchResults,
  } = useDiagnosticResults(
    patientId,
    expandedReportId ?? "",
    !!expandedReportId,
  );

  const showLoading = diagnosticsLoading && !diagnostics;
  const showError = !showLoading && diagnosticsError && !diagnostics;
  const showEmpty =
    !showLoading && !showError && !!diagnostics && diagnostics.length === 0;
  const showTable =
    !showLoading && !showError && !!diagnostics && diagnostics.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <FlaskConical className="h-5 w-5" />
        Diagnostics
      </h2>

      {showLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Performer</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-52" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
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

      {showError && (
        <ErrorState message="Failed to load diagnostics" onRetry={onRetry} />
      )}

      {showEmpty && (
        <EmptyState
          icon={FlaskConical}
          title="No diagnostics"
          subtitle="No diagnostic reports are available for this patient."
        />
      )}

      {showTable && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Performer</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.map((report) => {
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
                      <TableCell>{report.performer ?? "—"}</TableCell>
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
                        <TableCell colSpan={6} className="bg-muted/30">
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
