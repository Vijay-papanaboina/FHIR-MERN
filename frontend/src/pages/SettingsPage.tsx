import { LogOut, User, Moon } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { getInitials } from "@/lib/utils"
import { useSignOut } from "@/hooks/use-sign-out"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function SettingsPage() {
    const { data: session, isPending } = authClient.useSession()
    const { signOut, isSigningOut } = useSignOut()

    const userName = session?.user?.name ?? "User"
    const userEmail = session?.user?.email ?? ""
    const initials = getInitials(userName)

    if (isPending) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="mt-2 h-4 w-64" />
                </div>
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account and preferences.
                </p>
            </div>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile
                    </CardTitle>
                    <CardDescription>Your account information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarFallback className="text-lg">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <p className="text-lg font-semibold">{userName}</p>
                            {userEmail && (
                                <p className="text-sm text-muted-foreground">
                                    {userEmail}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5" />
                        Appearance
                    </CardTitle>
                    <CardDescription>
                        Customize how the dashboard looks.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Theme</p>
                            <p className="text-sm text-muted-foreground">
                                Switch between light, dark, and system theme.
                            </p>
                        </div>
                        <ModeToggle />
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Danger zone */}
            <Card className="border-destructive/30">
                <CardHeader>
                    <CardTitle className="text-destructive">Sign Out</CardTitle>
                    <CardDescription>
                        End your current session and return to the login page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={signOut}
                        disabled={isSigningOut}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        {isSigningOut ? "Signing out..." : "Sign out"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
