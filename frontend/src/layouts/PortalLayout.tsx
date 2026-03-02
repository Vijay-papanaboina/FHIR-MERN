import {
  Activity,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { AppShellLayout, type AppShellNavItem } from "@/layouts/AppShellLayout";

const portalNav: AppShellNavItem[] = [
  { title: "My Health", to: "/portal/health", icon: HeartPulse },
  { title: "My Vitals", to: "/portal/vitals", icon: Activity },
  { title: "My Care Team", to: "/portal/care-team", icon: Users },
  { title: "My Medications", to: "/portal/medications", icon: Pill },
  { title: "My Appointments", to: "/portal/appointments", icon: CalendarClock },
  { title: "My Conditions", to: "/portal/conditions", icon: ClipboardList },
  { title: "My Allergies", to: "/portal/allergies", icon: ShieldAlert },
  { title: "My Diagnostics", to: "/portal/diagnostics", icon: FlaskConical },
];

export function PortalLayout() {
  return (
    <AppShellLayout
      appTitle="FHIR Portal"
      appSubtitle="Patient View"
      appHomeTo="/portal/health"
      appHomeIcon={HeartPulse}
      navItems={portalNav}
      headerRight={<ModeToggle />}
      showSettings={false}
    />
  );
}
