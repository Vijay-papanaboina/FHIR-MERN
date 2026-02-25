import { Link } from "react-router";
import {
  Activity,
  Shield,
  Users,
  LineChart,
  ClipboardPlus,
  Stethoscope,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";

const FEATURES = [
  {
    icon: Users,
    title: "Patient Management",
    description:
      "Search and view patient demographics using FHIR R4 resources from your clinical data store.",
  },
  {
    icon: Activity,
    title: "Vital Signs Tracking",
    description:
      "Record and monitor vital observations such as heart rate, blood pressure, temperature, SpO₂, and more.",
  },
  {
    icon: LineChart,
    title: "Trend Visualization",
    description:
      "Interactive charts display vitals trends over time, helping identify patterns at a glance.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description:
      "Session-based authentication with Better-Auth, rate limiting, CORS, and Helmet security headers.",
  },
  {
    icon: ClipboardPlus,
    title: "FHIR R4 Compliant",
    description:
      "Built on HL7 FHIR R4 standards with LOINC-coded observations stored in HAPI FHIR server.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Workflow",
    description:
      "Designed for healthcare professionals with intuitive navigation, instant data recording, and real-time updates.",
  },
] as const;

export function LandingPage() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            <span className="text-lg font-bold tracking-tight">
              FHIR Clinical
            </span>
          </div>
          <nav className="flex items-center gap-8">
            {isLoggedIn ? (
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
            <ModeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute top-20 -right-40 h-[400px] w-[400px] rounded-full bg-chart-2/10 blur-3xl" />

        <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            FHIR R4 · HL7 · LOINC
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Modern{" "}
            <span className="bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
              Clinical Dashboard
            </span>
            <br />
            for Healthcare Teams
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            A full-stack FHIR-compliant application for managing patient
            records, tracking vital signs, and visualizing clinical data built
            with modern web technologies.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isLoggedIn ? (
              <Button size="lg" className="gap-2 text-base" asChild>
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="gap-2 text-base" asChild>
                  <Link to="/register">
                    Start using the dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base"
                  asChild
                >
                  <Link to="/login">Sign in to your account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              A complete clinical data platform, standards-compliant and
              production-ready.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create an account and start managing clinical data in minutes.
          </p>
          <Button size="lg" className="mt-8 gap-2 text-base" asChild>
            <Link to={isLoggedIn ? "/dashboard" : "/register"}>
              {isLoggedIn ? "Go to Dashboard" : "Create your account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              FHIR Clinical Dashboard
            </div>
            <p className="text-xs text-muted-foreground">
              Built with FHIR R4 standards · For demonstration purposes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
