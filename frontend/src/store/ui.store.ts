import { create } from "zustand"

export interface UIState {
    /** Whether the sidebar is collapsed */
    isSidebarCollapsed: boolean
    toggleSidebar: () => void

    /** Currently selected patient ID (for detail view) */
    selectedPatientId: string | null
    setSelectedPatientId: (id: string | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
    isSidebarCollapsed: false,
    toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

    selectedPatientId: null,
    setSelectedPatientId: (id) => set({ selectedPatientId: id }),
}))
