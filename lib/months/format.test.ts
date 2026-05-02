import { describe, expect, it } from 'vitest'
import {
  formatMonthLabelFR,
  groupTransactionsByMonth,
  monthSlugFromOpDate,
  parseMonthSlug,
} from './format'

describe('parseMonthSlug', () => {
  it('parses valid YYYY-MM', () => {
    expect(parseMonthSlug('2026-04')).toEqual({ year: 2026, month: 4 })
  })

  it('returns null for invalid format', () => {
    expect(parseMonthSlug('abc')).toBeNull()
    expect(parseMonthSlug('2026-4')).toBeNull()
    expect(parseMonthSlug('2026/04')).toBeNull()
    expect(parseMonthSlug('')).toBeNull()
  })

  it('returns null for invalid month (0, 13)', () => {
    expect(parseMonthSlug('2026-00')).toBeNull()
    expect(parseMonthSlug('2026-13')).toBeNull()
  })

  it('handles edge months', () => {
    expect(parseMonthSlug('2026-01')).toEqual({ year: 2026, month: 1 })
    expect(parseMonthSlug('2026-12')).toEqual({ year: 2026, month: 12 })
  })
})

describe('formatMonthLabelFR', () => {
  it('formats April 2026 in French', () => {
    expect(formatMonthLabelFR('2026-04')).toBe('Avril 2026')
  })

  it('capitalizes first letter', () => {
    expect(formatMonthLabelFR('2026-01')).toMatch(/^[A-ZÀ-Ÿ]/)
  })

  it('returns slug as-is on invalid input', () => {
    expect(formatMonthLabelFR('invalid')).toBe('invalid')
  })
})

describe('monthSlugFromOpDate', () => {
  it('extracts YYYY-MM from ISO date', () => {
    expect(monthSlugFromOpDate('2026-04-15')).toBe('2026-04')
  })

  it('handles different dates', () => {
    expect(monthSlugFromOpDate('2026-12-31')).toBe('2026-12')
    expect(monthSlugFromOpDate('2026-01-01')).toBe('2026-01')
  })
})

describe('groupTransactionsByMonth', () => {
  it('groups transactions by month and counts', () => {
    const transactions = [
      { op_date: '2026-04-15', amount: -10, hasAnnotation: false },
      { op_date: '2026-04-20', amount: -20, hasAnnotation: true },
      { op_date: '2026-03-10', amount: 100, hasAnnotation: true },
    ]
    const result = groupTransactionsByMonth(transactions)
    expect(result).toHaveLength(2)
    expect(result[0]?.monthSlug).toBe('2026-04') // most recent first
    expect(result[0]?.count).toBe(2)
    expect(result[0]?.score).toBe(-30)
    expect(result[0]?.toProcess).toBe(1) // only one not annotated
    expect(result[1]?.monthSlug).toBe('2026-03')
    expect(result[1]?.count).toBe(1)
    expect(result[1]?.score).toBe(100)
    expect(result[1]?.toProcess).toBe(0)
  })

  it('returns empty array for no transactions', () => {
    expect(groupTransactionsByMonth([])).toEqual([])
  })

  it('sorts months in descending order', () => {
    const transactions = [
      { op_date: '2026-01-15', amount: 0 },
      { op_date: '2026-04-15', amount: 0 },
      { op_date: '2026-02-15', amount: 0 },
      { op_date: '2025-12-15', amount: 0 },
    ]
    const result = groupTransactionsByMonth(transactions)
    expect(result.map((m) => m.monthSlug)).toEqual([
      '2026-04',
      '2026-02',
      '2026-01',
      '2025-12',
    ])
  })

  it('handles all-validated month (toProcess = 0)', () => {
    const transactions = [
      { op_date: '2026-04-15', amount: -10, hasAnnotation: true },
      { op_date: '2026-04-20', amount: -20, hasAnnotation: true },
    ]
    const result = groupTransactionsByMonth(transactions)
    expect(result[0]?.toProcess).toBe(0)
  })

  it('handles all-pending month (toProcess = count)', () => {
    const transactions = [
      { op_date: '2026-04-15', amount: -10 },
      { op_date: '2026-04-20', amount: -20 },
    ]
    const result = groupTransactionsByMonth(transactions)
    expect(result[0]?.toProcess).toBe(2)
  })
})
