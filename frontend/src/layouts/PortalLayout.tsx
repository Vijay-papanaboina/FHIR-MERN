import { NavLink, Outlet } from "react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import { getSessionUserValue } from "@/lib/roles";

const portalNav = [
  { label: "My Health", to: "/portal/health" },
  { label: "My Vitals", to: "/portal/vitals" },
  { label: "My Care Team", to: "/portal/care-team" },
  { label: "My Medications", to: "/portal/medications" },
];

export function PortalLayout() {
  const { signOut } = useSignOut();
  const { session } = useResolvedRole();
  const rawName = getSessionUserValue(session, "name");
  const userName = typeof rawName === "string" ? rawName : "Patient";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-6">
          <p className="font-semibold">FHIR Portal</p>
          <nav className="flex items-center gap-2">
            {portalNav.map((item) => (
              <Button key={item.to} asChild variant="ghost" size="sm">
                <NavLink to={item.to}>{item.label}</NavLink>
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {userName}
            </span>
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
