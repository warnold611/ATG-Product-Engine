import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ATG Product Engine',
  description: 'Arnold Trading Group — Content Pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0A0A0F', color: '#F0F0F8', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
