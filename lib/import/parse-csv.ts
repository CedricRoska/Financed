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
  // Fallback rank-based pour les CSV sans `reference` : autorise les doublons
  // légitimes (ex: 2 cafés identiques le même jour). Le 1er garde son content
  // hash, le 2e reçoit `:1`, etc. Ré-importer le même fichier produit les
  // mêmes ranks → mêmes hashes → dédup cross-fichier robuste.
  const contentHashOccurrences = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const lineNumber = i + 2 // header = line 1, data starts at line 2

    const normalized = normalizeBanquePopulaireRow(row, lineNumber)
    if ('kind' in normalized) {
      if (normalized.kind === 'parse' && normalized.message === 'Ligne vide ignorable') {
        continue
      }
      return normalized
    }

    const baseHash = await computeTransactionHash(
      normalized.op_date,
      normalized.amount,
      normalized.raw_label,
      normalized.reference,
    )

    // Avec une référence présente, le hash combine déjà ref + contenu :
    // collisions extrêmement improbables. Sans référence, on garde le suffixe
    // d'occurrence pour autoriser les vrais doublons légitimes (2 cafés mêmes
    // date/montant/libellé sans ref unique).
    let hash: string
    if (normalized.reference) {
      hash = baseHash
    } else {
      const occurrence = contentHashOccurrences.get(baseHash) ?? 0
      contentHashOccurrences.set(baseHash, occurrence + 1)
      hash = occurrence === 0 ? baseHash : `${baseHash}:${occurrence}`
    }

    transactions.push({
      op_date: normalized.op_date,
      amount: normalized.amount,
      raw_label: normalized.raw_label,
      hash,
      bank_op_type: normalized.bank_op_type,
      bank_category: normalized.bank_category,
      bank_subcategory: normalized.bank_subcategory,
    })
  }

  if (transactions.length === 0) {
    return { kind: 'empty', message: 'Aucune transaction utile trouvée dans le fichier.' }
  }

  return { transactions }
}
