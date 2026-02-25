import { RouterProvider } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { ThemeProvider } from "@/components/theme-provider"
import { router } from "@/router"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
        },
    },
})

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="fhir-ui-theme">
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
                <Toaster richColors position="top-right" />
            </QueryClientProvider>
        </ThemeProvider>
    )
}

export default App
