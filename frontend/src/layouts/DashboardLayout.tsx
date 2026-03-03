import { Activity, Bell, BriefcaseMedical, UserCog, Users } from "lucide-react";
import { AlertPanel } from "@/components/AlertPanel";
import { ModeToggle } from "@/components/mode-toggle";
import { AppShellLayout, type AppShellNavItem } from "@/layouts/AppShellLayout";
import { useAlertsSse } from "@/hooks/use-alerts-sse";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import type { AppRole } from "@/lib/roles";

const dashboardNavByRole: Partial<Record<AppRole, AppShellNavItem[]>> = {
  practitioner: [
    { title: "Patients", to: "/dashboard/patients", icon: Users },
    { title: "Alerts", to: "/dashboard/alerts", icon: Bell },
  ],
  admin: [
    { title: "Patients", to: "/dashboard/patients", icon: Users },
    { title: "Alerts", to: "/dashboard/alerts", icon: Bell },
    {
      title: "Assignments",
      to: "/dashboard/assignments",
      icon: BriefcaseMedical,
    },
    { title: "Users", to: "/dashboard/users", icon: UserCog },
  ],
};

export function DashboardLayout() {
  const { role } = useResolvedRole();
  useAlertsSse();

  return (
    <AppShellLayout
      appTitle="FHIR Dashboard"
      appSubtitle="Clinical Data"
      appHomeTo="/dashboard"
      appHomeIcon={Activity}
      navItems={role ? (dashboardNavByRole[role] ?? []) : []}
      headerRight={
        <>
          <AlertPanel />
          <ModeToggle />
        </>
      }
      settingsPath="/dashboard/settings"
      showSettings
    />
  );
}
