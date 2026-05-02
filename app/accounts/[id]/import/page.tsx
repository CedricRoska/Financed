import { AuthenticatedShell } from '@/components/authenticated-shell'
import { ImportClient } from './ImportClient'

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: accountId } = await params

  return (
    <AuthenticatedShell>
      <ImportClient accountId={accountId} />
    </AuthenticatedShell>
  )
}
