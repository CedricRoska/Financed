import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Financed',
  description: 'Reprenez le contrôle de chaque ligne de votre relevé bancaire.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
