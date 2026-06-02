import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comic Builder — Create Your Own Comic Book',
  description: 'Generate a personalized comic book with AI. Add characters, pick a theme, and watch your story come to life!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
