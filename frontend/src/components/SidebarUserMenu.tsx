import { useNavigate } from "react-router";
import { LogOut, Settings } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";
import { useSignOut } from "@/hooks/use-sign-out";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarUserMenuProps {
  settingsPath?: string;
  showSettings?: boolean;
}

export function SidebarUserMenu({
  settingsPath = "/dashboard/settings",
  showSettings = true,
}: SidebarUserMenuProps = {}) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const { signOut } = useSignOut();

  if (isPending) {
    return (
      <SidebarMenuButton size="lg" disabled>
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </SidebarMenuButton>
    );
  }

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = getInitials(userName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          tooltip={userName}
          className="cursor-pointer"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{userName}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{userName}</p>
            {userEmail && (
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showSettings && (
          <>
            <DropdownMenuItem onClick={() => navigate(settingsPath)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
