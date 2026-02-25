import { create } from "zustand"

export interface UIState {
    /** Whether the sidebar is collapsed */
    isSidebarCollapsed: boolean
    toggleSidebar: () => void
}

export const useUIStore = create<UIState>()((set) => ({
    isSidebarCollapsed: false,
    toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}))
