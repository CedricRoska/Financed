/**
 * Helpers de manipulation des mois pour la vue mensuelle.
 *
 * Format slug : YYYY-MM (ex: "2026-04")
 * Format label FR : "Avril 2026"
 */

const monthLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
})

const FR_MONTH_REGEX = /^(\d{4})-(\d{2})$/

export function parseMonthSlug(slug: string): { year: number; month: number } | null {
  const match = slug.match(FR_MONTH_REGEX)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

export function formatMonthLabelFR(slug: string): string {
  const parsed = parseMonthSlug(slug)
  if (!parsed) return slug
  // Construit une date au 1er du mois pour la formatter
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1))
  const label = monthLabelFormatter.format(date)
  // Capitalise la 1re lettre ("avril 2026" → "Avril 2026")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function monthSlugFromOpDate(opDate: string): string {
  // op_date est au format YYYY-MM-DD (ISO) — extraction directe
  return opDate.slice(0, 7)
}

export type MonthSummary = {
  monthSlug: string
  label: string
  count: number
  /** Compteur des transactions "à traiter" (= non validées par l'utilisateur). */
  toProcess: number
  score: number
}

type MinTransactionForGrouping = {
  op_date: string
  amount: number
  /** True si la transaction est "validée" (catégorisée + remboursement résolu si applicable). */
  hasAnnotation?: boolean
}

export function groupTransactionsByMonth(
  transactions: MinTransactionForGrouping[],
): MonthSummary[] {
  const map = new Map<string, MonthSummary>()

  for (const t of transactions) {
    const monthSlug = monthSlugFromOpDate(t.op_date)
    const existing = map.get(monthSlug)
    if (existing) {
      existing.count += 1
      existing.score += t.amount
      if (!t.hasAnnotation) existing.toProcess += 1
    } else {
      map.set(monthSlug, {
        monthSlug,
        label: formatMonthLabelFR(monthSlug),
        count: 1,
        toProcess: t.hasAnnotation ? 0 : 1,
        score: t.amount,
      })
    }
  }

  // Tri desc (mois le plus récent en premier)
  return [...map.values()].sort((a, b) => (a.monthSlug < b.monthSlug ? 1 : -1))
}
