'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UserCategory = {
  name: string
  count: number
}

/**
 * Liste les catégories utilisées par l'utilisateur (DISTINCT depuis annotations).
 * Pas de table dédiée en V1.1 : la "library" de catégories est dérivée des
 * annotations existantes. Permet rename / delete via bulk UPDATE.
 */
export async function getUserCategories(): Promise<UserCategory[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('transaction_annotations')
    .select('category')
    .eq('user_id', user.id)
    .not('category', 'is', null)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const name = row.category?.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/**
 * Renomme une catégorie : bulk UPDATE de toutes les annotations correspondantes.
 */
export async function renameCategory(formData: FormData) {
  const oldName = formData.get('old_name')
  const newName = formData.get('new_name')

  if (typeof oldName !== 'string' || typeof newName !== 'string') {
    redirect('/settings?error=invalid-form')
  }

  const trimmed = newName.trim()
  if (trimmed.length < 1 || trimmed.length > 100) {
    redirect('/settings?error=invalid-name')
  }

  if (trimmed === oldName) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('transaction_annotations')
    .update({ category: trimmed })
    .eq('user_id', user.id)
    .eq('category', oldName)

  if (error) {
    redirect('/settings?error=rename-failed')
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

/**
 * Supprime une catégorie : bulk SET category=NULL sur toutes les annotations.
 * Les transactions concernées repasseront "à traiter".
 */
export async function deleteCategory(formData: FormData) {
  const name = formData.get('name')

  if (typeof name !== 'string') {
    redirect('/settings?error=invalid-form')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('transaction_annotations')
    .update({ category: null })
    .eq('user_id', user.id)
    .eq('category', name)

  if (error) {
    redirect('/settings?error=delete-failed')
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}
