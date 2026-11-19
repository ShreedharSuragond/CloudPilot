import { create } from 'zustand'

type WorkspaceState = {
  activeOrganisationId: string | null
  setActiveOrganisationId: (organisationId: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeOrganisationId: null,
  setActiveOrganisationId: (organisationId) => set({ activeOrganisationId: organisationId }),
}))
