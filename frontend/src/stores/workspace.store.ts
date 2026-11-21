import { create } from 'zustand'

type WorkspaceState = {
  activeOrganisationId: string | null
  setActiveOrganisationId: (organisationId: string | null) => void
}

const STORAGE_KEY = 'cloudpilot_active_org'

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeOrganisationId: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  setActiveOrganisationId: (organisationId) => {
    if (typeof window !== 'undefined') {
      if (organisationId) {
        localStorage.setItem(STORAGE_KEY, organisationId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    set({ activeOrganisationId: organisationId })
  },
}))
