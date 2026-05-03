/**
 * Types partagés pour le pipeline d'import CSV.
 */

export type ParsedTransaction = {
  /** Format ISO YYYY-MM-DD */
  op_date: string
  /** Signé : négatif = débit, positif = crédit */
  amount: number
  /** Libellé brut tel qu'écrit par la banque */
  raw_label: string
  /** sha256 hex de (op_date | amount.toFixed(2) | normalizeLabel(raw_label)) */
  hash: string
  /** Métadonnées bancaires brutes (pré-classification BP) */
  bank_op_type: string | null
  bank_category: string | null
  bank_subcategory: string | null
}

export type ImportError = {
  kind: 'parse' | 'sanity' | 'too-many' | 'format' | 'empty'
  message: string
  /** Numéro de ligne du fichier source (1-indexed, header inclus) */
  line?: number
}

export type PreviewedTransaction = ParsedTransaction & {
  status: 'new' | 'duplicate'
}

export type ImportPreview = {
  transactions: PreviewedTransaction[]
  total: number
  newCount: number
  duplicateCount: number
}

export type CommitResult = {
  inserted: number
  duplicates: number
}
