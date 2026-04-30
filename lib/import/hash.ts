/**
 * Calcul du hash sha256 d'une transaction pour la dédup.
 *
 * La normalisation du label (uppercase, trim, collapse whitespace) garantit
 * que des espaces parasites ou des variations de casse ne causent pas de
 * faux négatifs de dédup.
 *
 * Implémentation via Web Crypto API : disponible nativement en navigateur
 * et en Node ≥ 16, sans dépendance npm supplémentaire.
 */

export function normalizeLabel(rawLabel: string): string {
  return rawLabel.toUpperCase().trim().replace(/\s+/g, ' ')
}

async function sha256Hex(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash robuste combinant `reference` (si fournie par la banque) et le contenu
 * (date + montant + libellé normalisé).
 *
 * Combiner les deux protège contre :
 *   - Les transactions de contenu identique mais de référence distincte
 *     (ex: 2 commandes Deliveroo le même jour → references différentes → hashes différents)
 *   - Les transactions partageant une même référence avec contenus distincts
 *     (ex: BP attribue parfois la même `Reference` à une paire FX achat+commission
 *      → contents différents → hashes différents)
 *
 * Quand la référence est absente, le hash retombe sur le contenu seul. Dans ce
 * mode, deux transactions légitimement identiques ne sont pas distinguables au
 * niveau hash : `parse-csv.ts` ajoute alors un suffixe d'occurrence.
 */
export function computeTransactionHash(
  opDate: string,
  amount: number,
  rawLabel: string,
  reference: string | null = null,
): Promise<string> {
  const contentPart = `${opDate}|${amount.toFixed(2)}|${normalizeLabel(rawLabel)}`
  const payload = reference ? `ref:${reference}|${contentPart}` : contentPart
  return sha256Hex(payload)
}
