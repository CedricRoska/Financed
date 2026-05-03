import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCardIcon, UploadIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { AuthenticatedShell } from '@/components/authenticated-shell'
import { AccountActions } from './AccountActions'
import { AccountOverview, type AccountTransactionLite } from './AccountOverview'
import { createClient } from '@/lib/supabase/server'
import { isTransactionValidated } from '@/lib/transactions/validation'

type AnnotationLite = {
  category: string | null
  expected_refund_from: string | null
  refund_resolved_at: string | null
  to_investigate: boolean | null
  pro_perso: 'pro' | 'perso' | null
}

function pickAnnotation(raw: unknown): AnnotationLite | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] ?? null) as AnnotationLite | null
  return raw as AnnotationLite
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, is_hybrid, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!account) {
    redirect('/dashboard')
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      'op_date, amount, transaction_annotations(category, expected_refund_from, refund_resolved_at, to_investigate, pro_perso)',
    )
    .eq('account_id', id)
    .order('op_date', { ascending: false })

  const enriched: AccountTransactionLite[] = (transactions ?? []).map((t) => {
    const annotation = pickAnnotation(t.transaction_annotations)
    return {
      op_date: t.op_date,
      amount: Number(t.amount),
      hasAnnotation: isTransactionValidated(
        annotation
          ? {
              category: annotation.category,
              expected_refund_from: annotation.expected_refund_from,
              refund_resolved_at: annotation.refund_resolved_at,
              to_investigate: annotation.to_investigate ?? false,
            }
          : null,
      ),
      proPerso: annotation?.pro_perso ?? null,
    }
  })

  return (
    <AuthenticatedShell>
      <section className="border-b bg-muted/20 px-6 pt-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <CreditCardIcon className="size-5 text-muted-foreground" />
              <h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1>
              {account.is_hybrid ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  Pro / Perso
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 pb-8 text-sm text-muted-foreground">
              {enriched.length} transaction{enriched.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 pb-8">
            <Link href={`/accounts/${account.id}/import`} className={buttonVariants()}>
              <UploadIcon className="size-4" />
              Importer un relevé
            </Link>
            <AccountActions accountId={account.id} accountName={account.name} />
          </div>
        </div>
      </section>

      <AccountOverview
        accountId={account.id}
        isHybrid={account.is_hybrid}
        transactions={enriched}
      />
    </AuthenticatedShell>
  )
}
