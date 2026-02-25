import { useNavigate } from "react-router"
import { toast } from "sonner"
import { LogOut, Settings } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import {
    SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export function SidebarUserMenu() {
    const { data: session, isPending } = authClient.useSession()
    const navigate = useNavigate()

    if (isPending) {
        return (
            <SidebarMenuButton size="lg" disabled>
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
            </SidebarMenuButton>
        )
    }

    const userName = session?.user?.name ?? "User"
    const userEmail = session?.user?.email ?? ""
    const nameTrimmed = userName.trim()
    const initials = nameTrimmed
        ? nameTrimmed
              .split(/\s+/)
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "?"

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
            navigate("/login", { replace: true })
        } catch {
            toast.error("Sign out failed")
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    size="lg"
                    tooltip={userName}
                    className="cursor-pointer"
                >
                    <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                        {userName}
                    </span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="start"
                className="w-56"
            >
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userName}</p>
                        {userEmail && (
                            <p className="text-xs text-muted-foreground">
                                {userEmail}
                            </p>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => navigate("/dashboard/settings")}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
