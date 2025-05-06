import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "OpenRouter Model Price Comparison",
  description: "Compare pricing across different AI models available on OpenRouter",
  openGraph: {
    title: "OpenRouter Model Price Comparison",
    description: "Compare pricing across different AI models available on OpenRouter",
    type: "website",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
