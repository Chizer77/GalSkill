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
            <body className="paper-texture min-h-screen flex flex-col pt-[5vh]">
                <div className=" w-full mx-auto max-w-[60rem] px-6 py-12">
                    {children}
                </div>
            </body>
        </html>
    )
}