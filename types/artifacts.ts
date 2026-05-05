export type ArtifactSection = {
  id: string
  figureNumber: string
  title: string
  body: string
  roles: string[]
}

export type ArtifactContent = {
  title: string
  sections: ArtifactSection[]
}

export type ArtifactType = 'personas' | 'flows' | 'ia' | 'synthesis'

export type AnalyzedArtifacts = {
  personas: ArtifactContent
  flows: ArtifactContent
  ia: ArtifactContent
  synthesis: ArtifactContent
  totalInputTokens: number
  totalOutputTokens: number
}
