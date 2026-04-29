import Papa from 'papaparse'
import { computeTransactionHash } from './hash'
import { normalizeBanquePopulaireRow } from './normalize-banque-populaire'
import type { ImportError, ParsedTransaction } from './types'

const DEFAULT_MAX_LINES = 10_000

type ParseSuccess = { transactions: ParsedTransaction[] }
type ParseResult = ParseSuccess | ImportError

/**
 * Parse un fichier CSV Banque Populaire côté client.
 *
 * Pipeline :
 *   1. Lecture en UTF-8 via FileReader
 *   2. Papa Parse (header: true, séparateur ';')
 *   3. Pour chaque ligne : normalisation Banque Populaire
 *   4. Calcul du hash sha256
 *   5. Vérification : aucun doublon intra-fichier
 */
export async function parseCSVFile(
  file: File,
  maxLines: number = DEFAULT_MAX_LINES,
): Promise<ParseResult> {
  const text = await file.text()

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^﻿/, '').trim(),
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]!
    return {
      kind: 'parse',
      message: `Erreur de parsing CSV : ${first.message}`,
      line: typeof first.row === 'number' ? first.row + 2 : undefined,
    }
  }

  const rows = parsed.data
  if (rows.length === 0) {
    return { kind: 'empty', message: 'Aucune transaction trouvée dans le fichier.' }
  }

  if (rows.length > maxLines) {
    return {
      kind: 'too-many',
      message: `Fichier trop volumineux (${rows.length} lignes, max ${maxLines} en V1).`,
    }
  }

  const transactions: ParsedTransaction[] = []
  const seenHashes = new Set<string>()
  const internalDuplicates: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const lineNumber = i + 2 // header = line 1, data starts at line 2

    const normalized = normalizeBanquePopulaireRow(row, lineNumber)
    if ('kind' in normalized) {
      // Tolère les lignes vides ignorables, bloque sur les autres erreurs
      if (normalized.kind === 'parse' && normalized.message === 'Ligne vide ignorable') {
        continue
      }
      return normalized
    }

    const hash = await computeTransactionHash(
      normalized.op_date,
      normalized.amount,
      normalized.raw_label,
    )

    if (seenHashes.has(hash)) {
      internalDuplicates.push(lineNumber)
      continue
    }
    seenHashes.add(hash)

    transactions.push({
      op_date: normalized.op_date,
      amount: normalized.amount,
      raw_label: normalized.raw_label,
      hash,
    })
  }

  if (internalDuplicates.length > 0) {
    return {
      kind: 'sanity',
      message: `${internalDuplicates.length} doublon(s) interne(s) détecté(s) dans le fichier (lignes ${internalDuplicates.slice(0, 5).join(', ')}${internalDuplicates.length > 5 ? '…' : ''}).`,
    }
  }

  if (transactions.length === 0) {
    return { kind: 'empty', message: 'Aucune transaction utile trouvée dans le fichier.' }
  }

  return { transactions }
}
