'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/actions'
import type { Tables } from '@/lib/supabase/types'

export type Project = Tables<'projects'>
export type Artifact = Tables<'artifacts'>

export async function listProjects(): Promise<ActionResult<Project[]>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export async function createProject(name: string): Promise<ActionResult<Project>> {
  const trimmedName = name.trim()
  if (!trimmedName) return { success: false, error: 'Name is required' }
  if (trimmedName.length > 100) return { success: false, error: 'Name must be 100 characters or fewer' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) return { success: false, error: authError.message }
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()
  if (profileError) return { success: false, error: profileError.message }
  if (!profile) return { success: false, error: 'Profile not found' }

  if (profile.subscription_tier === 'free') {
    // Single atomic RPC: reads cap from config, advisory-locks per user, checks count, inserts (AC1, AC3, AC6)
    const { data: rows, error: rpcError } = await supabase
      .rpc('create_project_if_cap_allows', { p_name: trimmedName })

    if (rpcError) {
      if (rpcError.code === 'P0001' && rpcError.message.startsWith('CAP_REACHED:')) {
        const count = parseInt(rpcError.message.split(':')[1] ?? '0', 10)
        return { success: false, error: `PROJECT_CAP_REACHED:${isNaN(count) ? 0 : count}` }
      }
      if (rpcError.code === 'P0001' && rpcError.message === 'CAP_CONFIG_MISSING') {
        return { success: false, error: 'Cap configuration not found' }
      }
      if (rpcError.code === '22P02') {
        return { success: false, error: 'Invalid cap configuration' }
      }
      return { success: false, error: rpcError.message }
    }

    if (!rows || rows.length === 0) return { success: false, error: 'Project creation failed' }
    return { success: true, data: rows[0] }
  }

  // Pro-tier path: no cap check, direct insert (AC5)
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: trimmedName,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getProject(projectId: string): Promise<ActionResult<Project | null>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  // PGRST116: no rows returned — RLS blocked (another user's realm) or does not exist
  if (error?.code === 'PGRST116') return { success: true, data: null }
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getArtifacts(projectId: string): Promise<ActionResult<Artifact[]>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export async function deleteProject(projectId: string): Promise<ActionResult<void>> {
  const supabase = await createServerClient()

  const { error } = await supabase.rpc('delete_project', { p_project_id: projectId })

  if (error) return { success: false, error: 'Failed to delete project. Please try again.' }
  return { success: true, data: undefined }
}
