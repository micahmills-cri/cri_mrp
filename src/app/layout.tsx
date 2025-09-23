import './globals.css'
import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Boat Factory Operations',
  description: 'Operations MVP for high-mix, low-volume boat factory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 font-sans antialiased">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}