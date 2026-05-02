'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  CreditCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  WalletIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SearchCommand } from '@/components/search-command'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

type SidebarAccount = {
  id: string
  name: string
  is_hybrid: boolean
}

type AppShellProps = {
  email: string
  accounts: SidebarAccount[]
  children: React.ReactNode
}

const PRIMARY_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/settings', label: 'Paramètres', icon: SettingsIcon },
]

export function AppShell({ email, accounts, children }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <SidebarContent
          email={email}
          accounts={accounts}
          pathname={pathname}
          onNavigate={() => {}}
        />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            email={email}
            accounts={accounts}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir la navigation"
          >
            <MenuIcon className="size-5" />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <WalletIcon className="size-5" />
            <span className="font-semibold">Financed</span>
          </Link>
          <ThemeToggle />
        </div>

        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({
  email,
  accounts,
  pathname,
  onNavigate,
}: {
  email: string
  accounts: SidebarAccount[]
  pathname: string | null
  onNavigate: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
          <WalletIcon className="size-5" />
          <span className="text-lg font-semibold tracking-tight">Financed</span>
        </Link>
        <button
          type="button"
          onClick={onNavigate}
          className="lg:hidden"
          aria-label="Fermer la navigation"
        >
          <XIcon className="size-5 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b px-3 py-3">
        <SearchCommand />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_LINKS.map((link) => {
            const active = pathname === link.href
            const Icon = link.icon
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span>{link.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Accounts list */}
        {accounts.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">
              Comptes
            </p>
            <ul className="flex flex-col gap-0.5">
              {accounts.map((account) => {
                const active = pathname?.startsWith(`/accounts/${account.id}`)
                return (
                  <li key={account.id}>
                    <Link
                      href={`/accounts/${account.id}`}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                        active
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <CreditCardIcon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{account.name}</span>
                      {account.is_hybrid ? (
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            active
                              ? 'bg-background/20 text-background'
                              : 'bg-emerald-50 text-emerald-700',
                          )}
                        >
                          Hybrid
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Connecté</span>
            <span className="truncate text-sm font-medium" title={email}>
              {email}
            </span>
          </div>
          <ThemeToggle />
        </div>
        <form action="/logout" method="POST" className="mt-2">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOutIcon className="size-4" />
            Se déconnecter
          </Button>
        </form>
      </div>
    </>
  )
}
