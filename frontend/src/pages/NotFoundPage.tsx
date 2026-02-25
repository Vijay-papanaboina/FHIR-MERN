import { useEffect } from "react"
import { Link } from "react-router"

export function NotFoundPage() {
    useEffect(() => {
        document.title = "404 — Page Not Found"
    }, [])

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
            <h1 className="text-6xl font-bold">404</h1>
            <p className="text-lg text-muted-foreground">
                Page not found
            </p>
            <Link
                to="/"
                className="text-primary underline-offset-4 hover:underline"
            >
                Go home
            </Link>
        </main>
    )
}
