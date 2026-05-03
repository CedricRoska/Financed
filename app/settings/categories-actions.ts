'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UserCategory = {
  name: string
  count: number
  subcategories: { name: string; count: number }[]
}

/**
 * Liste les catégories utilisées par l'utilisateur (DISTINCT depuis annotations)
 * avec leurs sous-catégories regroupées.
 */
export async function getUserCategories(): Promise<UserCategory[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('transaction_annotations')
    .select('category, subcategory')
    .eq('user_id', user.id)
    .not('category', 'is', null)

  const counts = new Map<string, { count: number; subs: Map<string, number> }>()
  for (const row of data ?? []) {
    const cat = row.category?.trim()
    if (!cat) continue
    const entry = counts.get(cat) ?? { count: 0, subs: new Map() }
    entry.count += 1
    const sub = row.subcategory?.trim()
    if (sub) {
      entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1)
    }
    counts.set(cat, entry)
  }

  return [...counts.entries()]
    .map(([name, entry]) => ({
      name,
      count: entry.count,
      subcategories: [...entry.subs.entries()]
        .map(([subName, subCount]) => ({ name: subName, count: subCount }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
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
  if (trimmed.length < 2 || trimmed.length > 100) {
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
 * Supprime une catégorie : bulk SET category=NULL et subcategory=NULL.
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
    .update({ category: null, subcategory: null })
    .eq('user_id', user.id)
    .eq('category', name)

  if (error) {
    redirect('/settings?error=delete-failed')
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

/**
 * Renomme une sous-catégorie au sein d'une catégorie donnée.
 */
export async function renameSubcategory(
  category: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim()
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new Error('Le nom doit contenir entre 2 et 100 caractères')
  }
  if (trimmed === oldName) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('transaction_annotations')
    .update({ subcategory: trimmed })
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('subcategory', oldName)

  if (error) throw new Error(`Erreur rename : ${error.message}`)

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

/**
 * Supprime une sous-catégorie : SET subcategory=NULL pour les annotations
 * matchantes (la catégorie reste, la transaction reste validée).
 */
export async function deleteSubcategory(
  category: string,
  name: string,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('transaction_annotations')
    .update({ subcategory: null })
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('subcategory', name)

  if (error) throw new Error(`Erreur suppression : ${error.message}`)

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}
