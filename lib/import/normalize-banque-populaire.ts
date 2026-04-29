import type { ImportError } from './types'

/**
 * Normalisation d'une ligne de CSV Banque Populaire vers la structure interne.
 *
 * Format attendu :
 *   - Séparateur : `;`
 *   - Encoding : UTF-8 (BOM toléré)
 *   - Colonnes : "Date opération" / "Date valeur" / "Libellé" / "Débit euros" / "Crédit euros" / "Solde euros"
 *   - Date : DD/MM/YYYY (français)
 *   - Montants : décimal virgule, espaces de millier optionnels (ex: "1 234,56")
 *
 * Le matching des colonnes est tolérant (lowercase, sans accents, sans espaces)
 * pour absorber les variations mineures de export Banque Populaire.
 */

type RawRow = Record<string, string>

const COLUMN_KEYS = {
  opDate: ['dateoperation', 'dateope', 'date'],
  rawLabel: ['libelle', 'libelleoperation', 'description'],
  debit: ['debit', 'debiteuros'],
  credit: ['credit', 'crediteuros'],
} as const

function normalizeColumnKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function findColumn(row: RawRow, candidates: readonly string[]): string | null {
  for (const rawKey of Object.keys(row)) {
    const normalized = normalizeColumnKey(rawKey)
    if (candidates.includes(normalized)) {
      return rawKey
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
  // Validation : reconstruire et comparer pour détecter dates invalides (ex: 31/02)
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
  // Format français : "1 234,56" ou "1234,56" ou "-1 234,56"
  const cleaned = trimmed.replace(/\s/g, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)
  if (Number.isNaN(parsed)) return null
  return parsed
}

export type NormalizedRow = {
  op_date: string
  amount: number
  raw_label: string
}

export function normalizeBanquePopulaireRow(
  row: RawRow,
  lineNumber: number,
): NormalizedRow | ImportError {
  const dateColumn = findColumn(row, COLUMN_KEYS.opDate)
  const labelColumn = findColumn(row, COLUMN_KEYS.rawLabel)
  const debitColumn = findColumn(row, COLUMN_KEYS.debit)
  const creditColumn = findColumn(row, COLUMN_KEYS.credit)

  if (!dateColumn || !labelColumn || (!debitColumn && !creditColumn)) {
    return {
      kind: 'format',
      message:
        'Colonnes Banque Populaire non détectées. Attendu : "Date opération", "Libellé", "Débit euros", "Crédit euros".',
    }
  }

  const dateRaw = row[dateColumn] ?? ''
  const labelRaw = row[labelColumn] ?? ''
  const debitRaw = debitColumn ? (row[debitColumn] ?? '') : ''
  const creditRaw = creditColumn ? (row[creditColumn] ?? '') : ''

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

  // Banque Populaire : débit comme nombre négatif, crédit comme nombre positif
  // Si débit est exprimé comme positif, on inverse. Si déjà négatif, on garde.
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

  return {
    op_date: opDate,
    amount,
    raw_label: labelRaw.trim(),
  }
}
