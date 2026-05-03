import type { ImportError } from './types'

/**
 * Normalisation d'une ligne de CSV Banque Populaire vers la structure interne.
 *
 * Format réel observé (extract Cyberplus / iBP) :
 *   - Séparateur : `;`
 *   - Encoding : UTF-8 (BOM toléré)
 *   - 13 colonnes :
 *     "Date de comptabilisation;Libelle simplifie;Libelle operation;Reference;
 *      Informations complementaires;Type operation;Categorie;Sous categorie;
 *      Debit;Credit;Date operation;Date de valeur;Pointage operation"
 *   - Date : DD/MM/YYYY (français)
 *   - Montants : décimal virgule, espaces de millier optionnels
 *
 * Colonnes utilisées :
 *   - `Date operation` (et non `Date de comptabilisation`) : la date réelle
 *     du fait économique pour l'utilisateur
 *   - `Libelle operation` : libellé brut le plus détaillé
 *   - `Reference` : ID unique de la transaction côté banque (clé d'or pour la dédup)
 *   - `Debit` / `Credit` : montants signés
 *
 * Le matching est tolérant (lowercase, sans accents, sans espaces).
 */

type RawRow = Record<string, string>

const COLUMN_KEYS = {
  // "Date operation" est privilégié sur "Date de comptabilisation" et "Date de valeur"
  opDate: ['dateoperation', 'dateope', 'date'],
  // "Libelle operation" est plus détaillé que "Libelle simplifie"
  rawLabel: ['libelleoperation', 'libelle', 'description'],
  reference: ['reference', 'ref'],
  debit: ['debit', 'debiteuros'],
  credit: ['credit', 'crediteuros'],
  // Métadonnées bancaires (pré-classification fournie par BP)
  bankOpType: ['typeoperation', 'type'],
  bankCategory: ['categorie'],
  bankSubcategory: ['souscategorie', 'subcategorie'],
} as const

function normalizeColumnKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function findColumn(row: RawRow, candidates: readonly string[]): string | null {
  // Priorité aux candidats listés en premier (matching ordonné)
  for (const candidate of candidates) {
    for (const rawKey of Object.keys(row)) {
      if (normalizeColumnKey(rawKey) === candidate) {
        return rawKey
      }
    }
  }
  return null
}

function parseFrenchDate(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const day = match[1]!
  const month = match[2]!
  const year = match[3]!
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month)) {
    return null
  }
  return `${year}-${month}-${day}`
}

function parseFrenchAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const cleaned = trimmed.replace(/\s/g, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)
  if (Number.isNaN(parsed)) return null
  return parsed
}

export type NormalizedRow = {
  op_date: string
  amount: number
  raw_label: string
  /** Présent si la banque fournit un identifiant unique pour la transaction. */
  reference: string | null
  /** Type d'opération brute selon BP (Carte bancaire, Virement, …). */
  bank_op_type: string | null
  /** Catégorie brute selon BP (Alimentation, Loisirs, …). */
  bank_category: string | null
  /** Sous-catégorie brute selon BP (Restaurant, Pharmacie, …). */
  bank_subcategory: string | null
}

export function normalizeBanquePopulaireRow(
  row: RawRow,
  lineNumber: number,
): NormalizedRow | ImportError {
  const dateColumn = findColumn(row, COLUMN_KEYS.opDate)
  const labelColumn = findColumn(row, COLUMN_KEYS.rawLabel)
  const debitColumn = findColumn(row, COLUMN_KEYS.debit)
  const creditColumn = findColumn(row, COLUMN_KEYS.credit)
  const referenceColumn = findColumn(row, COLUMN_KEYS.reference)
  const bankOpTypeColumn = findColumn(row, COLUMN_KEYS.bankOpType)
  const bankCategoryColumn = findColumn(row, COLUMN_KEYS.bankCategory)
  const bankSubcategoryColumn = findColumn(row, COLUMN_KEYS.bankSubcategory)

  if (!dateColumn || !labelColumn || (!debitColumn && !creditColumn)) {
    return {
      kind: 'format',
      message:
        'Colonnes Banque Populaire non détectées. Attendu : "Date operation", "Libelle operation", "Debit", "Credit".',
    }
  }

  const dateRaw = row[dateColumn] ?? ''
  const labelRaw = row[labelColumn] ?? ''
  const debitRaw = debitColumn ? (row[debitColumn] ?? '') : ''
  const creditRaw = creditColumn ? (row[creditColumn] ?? '') : ''
  const referenceRaw = referenceColumn ? (row[referenceColumn] ?? '').trim() : ''

  if (dateRaw.trim() === '' && labelRaw.trim() === '') {
    return {
      kind: 'parse',
      message: 'Ligne vide ignorable',
      line: lineNumber,
    }
  }

  const opDate = parseFrenchDate(dateRaw)
  if (!opDate) {
    return {
      kind: 'parse',
      message: `Ligne ${lineNumber} : date invalide ("${dateRaw}"). Format attendu DD/MM/YYYY.`,
      line: lineNumber,
    }
  }

  const debit = debitRaw === '' ? null : parseFrenchAmount(debitRaw)
  const credit = creditRaw === '' ? null : parseFrenchAmount(creditRaw)

  if (debit === null && credit === null) {
    return {
      kind: 'parse',
      message: `Ligne ${lineNumber} : aucun montant valide en débit ou crédit.`,
      line: lineNumber,
    }
  }

  let amount: number
  if (debit !== null) {
    amount = debit > 0 ? -debit : debit
  } else if (credit !== null) {
    amount = credit < 0 ? -credit : credit
  } else {
    return {
      kind: 'parse',
      message: `Ligne ${lineNumber} : montant nul ou non parsable.`,
      line: lineNumber,
    }
  }

  if (labelRaw.trim() === '') {
    return {
      kind: 'parse',
      message: `Ligne ${lineNumber} : libellé vide.`,
      line: lineNumber,
    }
  }

  const bankOpType = bankOpTypeColumn ? (row[bankOpTypeColumn] ?? '').trim() : ''
  const bankCategory = bankCategoryColumn ? (row[bankCategoryColumn] ?? '').trim() : ''
  const bankSubcategory = bankSubcategoryColumn
    ? (row[bankSubcategoryColumn] ?? '').trim()
    : ''

  return {
    op_date: opDate,
    amount,
    raw_label: labelRaw.trim(),
    reference: referenceRaw === '' ? null : referenceRaw,
    bank_op_type: bankOpType === '' ? null : bankOpType,
    bank_category: bankCategory === '' ? null : bankCategory,
    bank_subcategory: bankSubcategory === '' ? null : bankSubcategory,
  }
}
