'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/actions'
import type { Tables } from '@/lib/supabase/types'

export type Project = Tables<'projects'>

export async function listProjects(): Promise<ActionResult<Project[]>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

// TODO Story 3.2: createProject
// TODO Story 3.4: deleteProject
