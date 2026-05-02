import { describe, expect, it } from 'vitest'
import {
  isTransactionToProcess,
  isTransactionValidated,
  type TransactionAnnotationFlags,
} from './validation'

const baseAnnotation: TransactionAnnotationFlags = {
  category: null,
  expected_refund_from: null,
  refund_resolved_at: null,
}

describe('isTransactionValidated', () => {
  it('returns false when annotation is null (not categorized)', () => {
    expect(isTransactionValidated(null)).toBe(false)
  })

  it('returns false when category is null', () => {
    expect(isTransactionValidated(baseAnnotation)).toBe(false)
  })

  it('returns false when category is empty string', () => {
    expect(isTransactionValidated({ ...baseAnnotation, category: '' })).toBe(false)
  })

  it('returns false when category is whitespace only', () => {
    expect(isTransactionValidated({ ...baseAnnotation, category: '   ' })).toBe(false)
  })

  it('returns true with category and no expected refund', () => {
    expect(
      isTransactionValidated({ ...baseAnnotation, category: 'Courses' }),
    ).toBe(true)
  })

  it('returns false with category but pending refund (not resolved)', () => {
    expect(
      isTransactionValidated({
        ...baseAnnotation,
        category: 'Vacances',
        expected_refund_from: 'Paul',
        refund_resolved_at: null,
      }),
    ).toBe(false)
  })

  it('returns true with category and resolved refund', () => {
    expect(
      isTransactionValidated({
        ...baseAnnotation,
        category: 'Vacances',
        expected_refund_from: 'Paul',
        refund_resolved_at: '2026-04-20T10:00:00Z',
      }),
    ).toBe(true)
  })

  it('returns false with empty expected_refund_from string (treated as no refund)', () => {
    // expected_refund_from = '' should be treated as falsy → no refund pending
    expect(
      isTransactionValidated({
        ...baseAnnotation,
        category: 'Courses',
        expected_refund_from: '',
      }),
    ).toBe(true)
  })
})

describe('isTransactionToProcess', () => {
  it('is the inverse of isTransactionValidated', () => {
    expect(isTransactionToProcess(null)).toBe(true)
    expect(
      isTransactionToProcess({ ...baseAnnotation, category: 'Courses' }),
    ).toBe(false)
    expect(
      isTransactionToProcess({
        ...baseAnnotation,
        category: 'Vacances',
        expected_refund_from: 'Paul',
      }),
    ).toBe(true)
  })
})
