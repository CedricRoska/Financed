/**
 * Logique unifiée pour déterminer si une transaction est "validée" ou "à traiter".
 *
 * Vocabulaire produit (et non comptable) :
 *   - "validée" = l'utilisateur a fait son boulot dessus (catégorisée, et soit
 *     pas de créance soit la créance est tagguée — l'attente passive du
 *     remboursement n'est pas du boulot restant)
 *   - "à traiter" = il reste quelque chose à faire activement (catégoriser ou
 *     investiguer)
 *
 * Règles :
 *   - Pas d'annotation → à traiter
 *   - Flag `to_investigate` actif → à traiter (le flag prime sur tout)
 *   - Pas de catégorie → à traiter
 *   - Sinon → validée (même si une créance est en attente de remboursement)
 *
 * Note : un remboursement peut être résolu en `cash` (reçu en liquide, invisible
 * dans le dashboard), `wire` (reçu par virement) ou `loss` (passé en perte).
 * Le statut « en attente de remboursement » est visualisé via le badge dédié
 * dans le tableau, pas via le statut « à traiter ».
 */

export type TransactionAnnotationFlags = {
  category: string | null
  expected_refund_from: string | null
  refund_resolved_at: string | null
  to_investigate?: boolean
}

export function isTransactionValidated(annotation: TransactionAnnotationFlags | null): boolean {
  if (!annotation) return false
  if (annotation.to_investigate) return false
  if (!annotation.category || annotation.category.trim() === '') return false
  return true
}

export function isTransactionToProcess(annotation: TransactionAnnotationFlags | null): boolean {
  return !isTransactionValidated(annotation)
}
