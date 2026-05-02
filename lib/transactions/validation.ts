/**
 * Logique unifiée pour déterminer si une transaction est "validée" ou "à traiter".
 *
 * Vocabulaire produit (et non comptable) :
 *   - "validée" = l'utilisateur a fait son boulot dessus (catégorisée + remboursement résolu)
 *   - "à traiter" = il reste quelque chose à faire (catégoriser ou résoudre la créance)
 *
 * Règles :
 *   - Pas d'annotation → à traiter
 *   - Pas de catégorie → à traiter
 *   - Remboursement attendu non résolu → à traiter (même si catégorisée)
 *   - Sinon → validée
 *
 * Note : un remboursement peut être résolu en `cash` (reçu en liquide, invisible
 * dans le dashboard), `wire` (reçu par virement) ou `loss` (passé en perte).
 */

export type TransactionAnnotationFlags = {
  category: string | null
  expected_refund_from: string | null
  refund_resolved_at: string | null
}

export function isTransactionValidated(annotation: TransactionAnnotationFlags | null): boolean {
  if (!annotation) return false
  if (!annotation.category || annotation.category.trim() === '') return false
  if (annotation.expected_refund_from && !annotation.refund_resolved_at) return false
  return true
}

export function isTransactionToProcess(annotation: TransactionAnnotationFlags | null): boolean {
  return !isTransactionValidated(annotation)
}
