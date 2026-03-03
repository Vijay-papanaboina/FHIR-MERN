import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import type { LucideIcon } from "lucide-react";
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
import { SidebarUserMenu } from "@/components/SidebarUserMenu";

export interface AppShellNavItem {
  title: string;
  to: string;
  icon: LucideIcon;
}

interface AppShellLayoutProps {
  appTitle: string;
  appSubtitle: string;
  appHomeTo: string;
  appHomeIcon: LucideIcon;
  navItems: AppShellNavItem[];
  headerRight?: ReactNode;
  settingsPath?: string;
  showSettings?: boolean;
}

function AppSidebar({
  appTitle,
  appSubtitle,
  appHomeTo,
  appHomeIcon: AppHomeIcon,
  navItems,
  settingsPath,
  showSettings,
}: Pick<
  AppShellLayoutProps,
  | "appTitle"
  | "appSubtitle"
  | "appHomeTo"
  | "appHomeIcon"
  | "navItems"
  | "settingsPath"
  | "showSettings"
>) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to={appHomeTo}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <AppHomeIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{appTitle}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {appSubtitle}
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
                <SidebarMenuItem key={item.to}>
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
            <SidebarUserMenu
              settingsPath={settingsPath}
              showSettings={showSettings}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export function AppShellLayout({
  appTitle,
  appSubtitle,
  appHomeTo,
  appHomeIcon,
  navItems,
  headerRight,
  settingsPath,
  showSettings,
}: AppShellLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        appTitle={appTitle}
        appSubtitle={appSubtitle}
        appHomeTo={appHomeTo}
        appHomeIcon={appHomeIcon}
        navItems={navItems}
        settingsPath={settingsPath}
        showSettings={showSettings}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <div className="flex-1" />
          {headerRight}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
