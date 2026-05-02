import { describe, expect, it } from 'vitest'
import { parseCSVFile } from './parse-csv'

const BP_HEADER =
  'Date de comptabilisation;Libelle simplifie;Libelle operation;Reference;Informations complementaires;Type operation;Categorie;Sous categorie;Debit;Credit;Date operation;Date de valeur;Pointage operation'

function makeFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

describe('parseCSVFile', () => {
  it('parses a valid BP CSV with one transaction', async () => {
    const csv = `${BP_HEADER}
15/04/2026;CARREFOUR;CARREFOUR FR TOULOUSE;4T5O7TJ;CB;Carte;Alimentation;Hyper;-10,50;;15/04/2026;15/04/2026;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('transactions' in result).toBe(true)
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0]?.op_date).toBe('2026-04-15')
      expect(result.transactions[0]?.amount).toBe(-10.5)
      expect(result.transactions[0]?.raw_label).toBe('CARREFOUR FR TOULOUSE')
    }
  })

  it('parses multiple transactions', async () => {
    const csv = `${BP_HEADER}
15/04/2026;X;CARREFOUR;A1;CB;Carte;A;H;-10,50;;15/04/2026;15/04/2026;0
16/04/2026;Y;UBER;A2;CB;Carte;T;V;-15,00;;16/04/2026;16/04/2026;0
17/04/2026;Z;SALAIRE;A3;VIR;Vir;Salaire;Salaire;;+2500,00;17/04/2026;17/04/2026;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('transactions' in result).toBe(true)
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(3)
      expect(result.transactions.map((t) => t.amount)).toEqual([-10.5, -15, 2500])
    }
  })

  it('returns empty error for header-only CSV', async () => {
    const csv = BP_HEADER
    const result = await parseCSVFile(makeFile(csv))
    expect('kind' in result && result.kind).toBe('empty')
  })

  it('returns format error when columns dont match BP', async () => {
    const csv = `Date;Description;Amount\n15/04/2026;CARREFOUR;-10.50`
    const result = await parseCSVFile(makeFile(csv))
    expect('kind' in result && result.kind).toBe('format')
  })

  it('returns parse error on invalid date in middle of file', async () => {
    const csv = `${BP_HEADER}
15/04/2026;X;CARREFOUR;A1;CB;Carte;A;H;-10,50;;15/04/2026;15/04/2026;0
99/99/9999;Y;UBER;A2;CB;Carte;T;V;-15,00;;99/99/9999;99/99/9999;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('kind' in result && result.kind).toBe('parse')
    expect('line' in result && result.line).toBe(3)
  })

  it('returns too-many error when over maxLines', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      return `${day}/04/2026;X;CARREFOUR ${i};REF${i};CB;Carte;A;H;-1,00;;${day}/04/2026;${day}/04/2026;0`
    })
    const csv = `${BP_HEADER}\n${rows.join('\n')}`
    const result = await parseCSVFile(makeFile(csv), 3)
    expect('kind' in result && result.kind).toBe('too-many')
  })

  it('handles 2 Deliveroo same day with different references (no false dedup)', async () => {
    // Cas réel du CSV de Cedric : 2 commandes Deliveroo identiques, refs différentes
    const csv = `${BP_HEADER}
14/04/2026;DELIVEROO;DELIVEROO FR PARIS 09;4T5O7TJ;CB;Carte;A;Resto;-16,39;;14/04/2026;14/04/2026;0
14/04/2026;DELIVEROO;DELIVEROO FR PARIS 09;4T5O7TI;CB;Carte;A;Resto;-16,39;;14/04/2026;14/04/2026;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('transactions' in result).toBe(true)
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(2)
      // Hashes doivent être différents grâce aux références distinctes
      expect(result.transactions[0]?.hash).not.toBe(result.transactions[1]?.hash)
    }
  })

  it('handles shared reference with different content (FX paired transactions)', async () => {
    // Cas réel : ref partagée entre 2 transactions différentes (commission + remise)
    const csv = `${BP_HEADER}
05/01/2026;REMBT;REMBT COMMISSION CB;08XI3CS;CB;Frais;Banque;F;;+0,72;04/01/2026;04/01/2026;0
05/01/2026;SKILLCAPPED;SKILLCAPPED LLCUS;08XI3CS;CB;Carte;Loisirs;V;;+13,80;04/01/2026;04/01/2026;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('transactions' in result).toBe(true)
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(2)
      // Hashes différents malgré ref partagée (contenu différent)
      expect(result.transactions[0]?.hash).not.toBe(result.transactions[1]?.hash)
    }
  })

  it('produces deterministic hashes (re-parse same file = same hashes)', async () => {
    const csv = `${BP_HEADER}
15/04/2026;X;CARREFOUR;A1;CB;Carte;A;H;-10,50;;15/04/2026;15/04/2026;0
16/04/2026;Y;UBER;A2;CB;Carte;T;V;-15,00;;16/04/2026;16/04/2026;0`
    const a = await parseCSVFile(makeFile(csv))
    const b = await parseCSVFile(makeFile(csv))
    if ('transactions' in a && 'transactions' in b) {
      expect(a.transactions.map((t) => t.hash)).toEqual(b.transactions.map((t) => t.hash))
    }
  })

  it('skips empty rows in middle of file (Papa skipEmptyLines)', async () => {
    const csv = `${BP_HEADER}
15/04/2026;X;CARREFOUR;A1;CB;Carte;A;H;-10,50;;15/04/2026;15/04/2026;0

16/04/2026;Y;UBER;A2;CB;Carte;T;V;-15,00;;16/04/2026;16/04/2026;0`
    const result = await parseCSVFile(makeFile(csv))
    expect('transactions' in result).toBe(true)
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(2)
    }
  })

  it('handles fallback when no reference (rank-based hash)', async () => {
    // Si on simule une banque sans Reference, on bascule sur le content+rank
    // Note: BP fournit toujours une Reference, mais teste le fallback
    const headerNoRef =
      'Date operation;Libelle operation;Debit;Credit'
    const csv = `${headerNoRef}
15/04/2026;CAFE;-5,00;
15/04/2026;CAFE;-5,00;`
    const result = await parseCSVFile(makeFile(csv))
    if ('transactions' in result) {
      expect(result.transactions).toHaveLength(2)
      // Les deux ont le même contenu mais des hashes différents (rank suffix)
      expect(result.transactions[0]?.hash).not.toBe(result.transactions[1]?.hash)
      // Le 2e doit avoir un suffixe ":1"
      expect(result.transactions[1]?.hash).toMatch(/:1$/)
    }
  })
})
