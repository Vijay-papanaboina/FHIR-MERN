import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Theme = "dark" | "light" | "system"

const VALID_THEMES: Theme[] = ["dark", "light", "system"]

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | null>(null)

function safeGetItem(key: string): string | null {
    if (typeof window === "undefined") return null
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

function safeSetItem(key: string, value: string): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(key, value)
    } catch {
        // Swallow — private browsing or storage quota exceeded
    }
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "fhir-ui-theme",
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = safeGetItem(storageKey)
        return stored && VALID_THEMES.includes(stored as Theme)
            ? (stored as Theme)
            : defaultTheme
    })

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        if (theme === "system") {
            const mql = window.matchMedia("(prefers-color-scheme: dark)")
            const applySystem = () => {
                root.classList.remove("light", "dark")
                root.classList.add(mql.matches ? "dark" : "light")
            }
            applySystem()
            mql.addEventListener("change", applySystem)
            return () => mql.removeEventListener("change", applySystem)
        }

        root.classList.add(theme)
    }, [theme])

    const setTheme = useCallback(
        (newTheme: Theme) => {
            safeSetItem(storageKey, newTheme)
            setThemeState(newTheme)
        },
        [storageKey],
    )

    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === null)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
