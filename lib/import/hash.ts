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

export async function computeTransactionHash(
  opDate: string,
  amount: number,
  rawLabel: string,
): Promise<string> {
  const payload = `${opDate}|${amount.toFixed(2)}|${normalizeLabel(rawLabel)}`
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
