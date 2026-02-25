import { NavLink, Outlet, useNavigate } from "react-router"
import { toast } from "sonner"
import { Users, Settings, LogOut, Activity } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { ModeToggle } from "@/components/mode-toggle"
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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"

const navItems = [
    { title: "Patients", to: "/dashboard/patients", icon: Users },
    { title: "Settings", to: "/dashboard/settings", icon: Settings },
]

function AppSidebar() {
    const { data: session } = authClient.useSession()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
        } catch {
            toast.error("Sign out failed")
        } finally {
            navigate("/login")
        }
    }

    const nameTrimmed = session?.user?.name?.trim()
    const initials = nameTrimmed
        ? nameTrimmed
              .split(/\s+/)
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "?"

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
                                    <span className="truncate font-semibold">
                                        FHIR Dashboard
                                    </span>
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
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                    >
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
                        <SidebarMenuButton tooltip={session?.user?.name ?? "User"}>
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm">
                                {session?.user?.name ?? "User"}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sign out"
                            onClick={handleSignOut}
                        >
                            <LogOut />
                            <span>Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}

export function DashboardLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 h-4!"
                        />
                        <div className="flex-1" />
                        <ModeToggle />
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-6">
                        <Outlet />
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    )
}
