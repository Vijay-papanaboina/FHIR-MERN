import { NavLink, Outlet } from "react-router";
import { Users, Activity, Bell, BriefcaseMedical, UserCog } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { AlertPanel } from "@/components/AlertPanel";
import { SidebarUserMenu } from "@/components/SidebarUserMenu";
import { useAlertsSse } from "@/hooks/use-alerts-sse";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import type { AppRole } from "@/lib/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";

type NavItem = {
  title: string;
  to: string;
  icon: typeof Users;
};

const dashboardNavByRole: Partial<Record<AppRole, NavItem[]>> = {
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

function AppSidebar({ role }: { role: AppRole | null }) {
  const navItems = role ? (dashboardNavByRole[role] ?? []) : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Activity className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">FHIR Dashboard</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Clinical Data
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarUserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export function DashboardLayout() {
  const { role } = useResolvedRole();
  useAlertsSse();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={role} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4!" />
            <div className="flex-1" />
            <AlertPanel />
            <ModeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
