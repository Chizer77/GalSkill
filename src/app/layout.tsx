import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const tsanger = localFont({
    src: '../assets/fonts/TsangerJinKai02-W04.ttf',
    variable: '--font-tsanger',
    weight: '400 500',
    display: 'swap',
})

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
        <html lang="zh-CN" className={tsanger.variable}>
            <body className="min-h-screen flex flex-col">
                <div className="w-full mx-auto max-w-[1120px] px-16 py-16">
                    {children}
                </div>
            </body>
        </html>
    )
}

