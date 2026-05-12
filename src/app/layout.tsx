import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'GalSkill',
    description: 'Tracing a girl\'s heartbeat into skills.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-CN">
            <body className="min-h-screen flex flex-col">
                <div className="w-full mx-auto max-w-[1120px] px-16 py-16">
                    {children}
                </div>
            </body>
        </html>
    )
}

