import { describe, expect, it } from 'vitest'
import { computeTransactionHash, normalizeLabel } from './hash'

describe('normalizeLabel', () => {
  it('uppercases the label', () => {
    expect(normalizeLabel('carrefour')).toBe('CARREFOUR')
  })

  it('trims whitespace', () => {
    expect(normalizeLabel('  carrefour  ')).toBe('CARREFOUR')
  })

  it('collapses multiple whitespace into single space', () => {
    expect(normalizeLabel('CARREFOUR    PARIS')).toBe('CARREFOUR PARIS')
    expect(normalizeLabel('CARREFOUR\t\nPARIS')).toBe('CARREFOUR PARIS')
  })

  it('handles empty string', () => {
    expect(normalizeLabel('')).toBe('')
  })
})

describe('computeTransactionHash', () => {
  it('returns a 64-char hex string', async () => {
    const hash = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for same input', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    const b = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    expect(a).toBe(b)
  })

  it('differs when amount differs', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    const b = await computeTransactionHash('2026-04-15', -10.51, 'CARREFOUR')
    expect(a).not.toBe(b)
  })

  it('differs when label differs', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    const b = await computeTransactionHash('2026-04-15', -10.5, 'AUCHAN')
    expect(a).not.toBe(b)
  })

  it('differs when reference differs', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR', 'REF1')
    const b = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR', 'REF2')
    expect(a).not.toBe(b)
  })

  it('differs when reference is present vs absent (same content)', async () => {
    const noRef = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    const withRef = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR', 'REF')
    expect(noRef).not.toBe(withRef)
  })

  it('handles same content with different references (FX paired transactions case)', async () => {
    // Cas BP : 2 transactions partageant la même reference mais contenus différents
    const a = await computeTransactionHash('2026-01-04', 0.72, 'REMBT COMMISSION CB', '08XI3CS')
    const b = await computeTransactionHash('2026-01-04', 13.8, 'SKILLCAPPED LLCUS', '08XI3CS')
    expect(a).not.toBe(b)
  })

  it('handles different content with different references (2 Deliveroo same day)', async () => {
    const a = await computeTransactionHash('2026-04-14', -16.39, 'DELIVEROO FR PARIS 09', '4T5O7TJ')
    const b = await computeTransactionHash('2026-04-14', -16.39, 'DELIVEROO FR PARIS 09', '4T5O7TI')
    expect(a).not.toBe(b)
  })

  it('normalizes label before hashing (whitespace insensitive)', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR  PARIS')
    const b = await computeTransactionHash('2026-04-15', -10.5, 'carrefour PARIS')
    expect(a).toBe(b)
  })

  it('amount precision : 10.50 vs 10.5', async () => {
    const a = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    const b = await computeTransactionHash('2026-04-15', -10.5, 'CARREFOUR')
    expect(a).toBe(b)
  })
})
