import { describe, expect, it } from 'vitest'
import { normalizeBanquePopulaireRow } from './normalize-banque-populaire'

const validBPRow = {
  'Date de comptabilisation': '15/04/2026',
  'Libelle simplifie': 'CARREFOUR',
  'Libelle operation': 'CARREFOUR FR TOULOUSE',
  Reference: '4T5O7TJ',
  'Informations complementaires': 'CB****5910',
  'Type operation': 'Carte bancaire',
  Categorie: 'Alimentation',
  'Sous categorie': 'Hyper/supermarche',
  Debit: '-10,50',
  Credit: '',
  'Date operation': '15/04/2026',
  'Date de valeur': '15/04/2026',
  'Pointage operation': '0',
}

describe('normalizeBanquePopulaireRow', () => {
  it('parses a valid debit row', () => {
    const result = normalizeBanquePopulaireRow(validBPRow, 2)
    expect(result).toEqual({
      op_date: '2026-04-15',
      amount: -10.5,
      raw_label: 'CARREFOUR FR TOULOUSE',
      reference: '4T5O7TJ',
      bank_op_type: 'Carte bancaire',
      bank_category: 'Alimentation',
      bank_subcategory: 'Hyper/supermarche',
    })
  })

  it('parses a valid credit row', () => {
    const row = { ...validBPRow, Debit: '', Credit: '+2500,00' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect(result).toEqual({
      op_date: '2026-04-15',
      amount: 2500,
      raw_label: 'CARREFOUR FR TOULOUSE',
      reference: '4T5O7TJ',
      bank_op_type: 'Carte bancaire',
      bank_category: 'Alimentation',
      bank_subcategory: 'Hyper/supermarche',
    })
  })

  it('uses Date operation, not Date de comptabilisation', () => {
    const row = {
      ...validBPRow,
      'Date de comptabilisation': '20/04/2026',
      'Date operation': '15/04/2026',
    }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('op_date' in result && result.op_date).toBe('2026-04-15')
  })

  it('uses Libelle operation, not Libelle simplifie', () => {
    const row = {
      ...validBPRow,
      'Libelle simplifie': 'SHORT',
      'Libelle operation': 'CARREFOUR FR TOULOUSE LONG',
    }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('raw_label' in result && result.raw_label).toBe('CARREFOUR FR TOULOUSE LONG')
  })

  it('extracts reference when present', () => {
    const result = normalizeBanquePopulaireRow(validBPRow, 2)
    expect('reference' in result && result.reference).toBe('4T5O7TJ')
  })

  it('returns null reference when missing', () => {
    const row = { ...validBPRow, Reference: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('reference' in result && result.reference).toBeNull()
  })

  it('returns format error when Date operation column missing', () => {
    const row = { Libelle: 'X', Debit: '-10', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('format')
  })

  it('returns format error when label column missing', () => {
    const row = { 'Date operation': '15/04/2026', Debit: '-10', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('format')
  })

  it('returns format error when both Debit and Credit columns are missing', () => {
    const row = { 'Date operation': '15/04/2026', 'Libelle operation': 'X' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('format')
  })

  it('returns parse error on invalid date', () => {
    const row = { ...validBPRow, 'Date operation': '31/02/2026' }
    const result = normalizeBanquePopulaireRow(row, 5)
    expect('kind' in result && result.kind).toBe('parse')
    expect('line' in result && result.line).toBe(5)
  })

  it('returns parse error on date format different from DD/MM/YYYY', () => {
    const row = { ...validBPRow, 'Date operation': '2026-04-15' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('parse')
  })

  it('returns parse error when both amounts are non-numeric', () => {
    const row = { ...validBPRow, Debit: 'abc', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('parse')
  })

  it('returns "ligne vide ignorable" on empty row', () => {
    const row = { ...validBPRow, 'Date operation': '', 'Libelle operation': '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('kind' in result && result.kind).toBe('parse')
    expect('message' in result && result.message).toBe('Ligne vide ignorable')
  })

  it('handles French amount with thousands space (1 234,56)', () => {
    const row = { ...validBPRow, Debit: '-1 234,56', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('amount' in result && result.amount).toBe(-1234.56)
  })

  it('handles negative debit (already signed)', () => {
    const row = { ...validBPRow, Debit: '-10,50', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('amount' in result && result.amount).toBe(-10.5)
  })

  it('handles positive debit (force to negative)', () => {
    const row = { ...validBPRow, Debit: '10,50', Credit: '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('amount' in result && result.amount).toBe(-10.5)
  })

  it('handles credit with leading +', () => {
    const row = { ...validBPRow, Debit: '', Credit: '+50,00' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('amount' in result && result.amount).toBe(50)
  })

  it('trims raw_label', () => {
    const row = { ...validBPRow, 'Libelle operation': '   CARREFOUR  ' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('raw_label' in result && result.raw_label).toBe('CARREFOUR')
  })

  it('matches columns insensitive to case and accents', () => {
    const row = {
      'DATE OPERATION': '15/04/2026',
      'LIBELLE OPERATION': 'CARREFOUR',
      DEBIT: '-10,50',
      CREDIT: '',
    }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('op_date' in result && result.op_date).toBe('2026-04-15')
  })

  it('extracts bank_op_type, bank_category, bank_subcategory from BP CSV', () => {
    const result = normalizeBanquePopulaireRow(validBPRow, 2)
    expect('bank_op_type' in result && result.bank_op_type).toBe('Carte bancaire')
    expect('bank_category' in result && result.bank_category).toBe('Alimentation')
    expect('bank_subcategory' in result && result.bank_subcategory).toBe('Hyper/supermarche')
  })

  it('returns null bank metadata when columns are absent', () => {
    const row = {
      'Date operation': '15/04/2026',
      'Libelle operation': 'TEST',
      Debit: '-10,00',
      Credit: '',
    }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('bank_op_type' in result && result.bank_op_type).toBeNull()
    expect('bank_category' in result && result.bank_category).toBeNull()
    expect('bank_subcategory' in result && result.bank_subcategory).toBeNull()
  })

  it('returns null bank metadata when columns are empty strings', () => {
    const row = { ...validBPRow, 'Type operation': '', Categorie: '', 'Sous categorie': '' }
    const result = normalizeBanquePopulaireRow(row, 2)
    expect('bank_op_type' in result && result.bank_op_type).toBeNull()
    expect('bank_category' in result && result.bank_category).toBeNull()
    expect('bank_subcategory' in result && result.bank_subcategory).toBeNull()
  })
})
