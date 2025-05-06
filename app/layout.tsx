import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenRouter Model Comparison',
  description: 'Easily compare all available AI models on OpenRouter. See detailed information on pricing, context length, features, and providers to make the best choice for your applications.',
  generator: 'v0.dev',
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
