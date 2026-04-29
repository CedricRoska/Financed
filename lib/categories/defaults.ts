/**
 * Catégories suggérées par défaut, hardcodées en V1.
 *
 * Affichées via `<datalist>` pour autocomplétion. L'utilisateur peut taper
 * n'importe quelle valeur libre — ces suggestions sont seulement un raccourci
 * pour les catégories les plus fréquentes en finance perso française.
 *
 * Une vraie table `categories` (avec création / renommage / suppression — FR29)
 * sera introduite quand un picker UI sera nécessaire (post-MVP).
 */

export const DEFAULT_CATEGORY_SUGGESTIONS = [
  'Loyer',
  'Courses',
  'Transports',
  'Restaurants',
  'Abonnements',
  'Salaire',
  'Remboursements amis',
  'Investissements',
  'Vacances',
  'Santé',
  'Cadeaux',
  'Énergie',
  'Téléphonie',
  'Loisirs',
  'Autres',
] as const

export type CategorySuggestion = (typeof DEFAULT_CATEGORY_SUGGESTIONS)[number]
