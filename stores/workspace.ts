import { create } from 'zustand'

type WorkspaceStore = {
  phase: 'input' | 'loading' | 'workspace'
  activeArtifact: 'flows' | 'personas' | 'ia' | 'synthesis'
  activeRole: string | null
  regeneratingSection: string | null
  setPhase: (phase: WorkspaceStore['phase']) => void
  setActiveArtifact: (artifact: WorkspaceStore['activeArtifact']) => void
  setActiveRole: (role: string | null) => void
  setRegeneratingSection: (sectionId: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  phase: 'input',
  activeArtifact: 'flows',
  activeRole: null,
  regeneratingSection: null,
  setPhase: (phase) => set({ phase }),
  setActiveArtifact: (activeArtifact) => set({ activeArtifact }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setRegeneratingSection: (regeneratingSection) => set({ regeneratingSection }),
}))
