import { Activity } from "lucide-react";
import type { VitalsDTO } from "@fhir-mern/shared";
import { formatDateTime } from "@/lib/format";
import { VitalsChart } from "@/components/VitalsChart";
import { RecordVitalDialog } from "@/components/RecordVitalDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PatientVitalsTabProps {
  patientId: string;
  vitals: VitalsDTO[] | undefined;
  vitalsLoading: boolean;
  vitalsError: boolean;
  onRetry: () => void;
}

export function PatientVitalsTab({
  patientId,
  vitals,
  vitalsLoading,
  vitalsError,
  onRetry,
}: PatientVitalsTabProps) {
  const showLoadingState = vitalsLoading && !vitals;
  const showErrorState = !showLoadingState && vitalsError && !vitals;
  const showEmptyState =
    !showLoadingState && !showErrorState && !!vitals && vitals.length === 0;
  const showDataState =
    !showLoadingState && !showErrorState && !!vitals && vitals.length > 0;

  return (
    <>
      {showLoadingState && <Skeleton className="h-[300px] w-full rounded-xl" />}
      {showDataState && vitals && <VitalsChart vitals={vitals} />}

      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5" />
            Vital Signs
          </h2>
          <span className="ml-auto">
            <RecordVitalDialog patientId={patientId} />
          </span>
        </div>

        {showLoadingState && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showErrorState && (
          <ErrorState message="Failed to load vitals" onRetry={onRetry} />
        )}

        {showEmptyState && (
          <EmptyState
            icon={Activity}
            title="No vitals recorded"
            subtitle="No vital sign observations found for this patient"
          />
        )}

        {showDataState && vitals && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitals.map((vital) => (
                  <TableRow key={vital.id}>
                    <TableCell className="font-medium">{vital.type}</TableCell>
                    <TableCell>
                      {vital.value != null
                        ? `${vital.value}${vital.unit ? ` ${vital.unit}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDateTime(vital.recordedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
