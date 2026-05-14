import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { readFileSync } from 'fs'
import path from 'path'
import './globals.css'

const tsanger = localFont({
    src: '../assets/fonts/TsangerJinKai02-W04.woff2',
    variable: '--font-tsanger',
    weight: '400 500',
    display: 'swap',
})

const iconPath = path.join(process.cwd(), 'src/assets/icon.svg')
const iconData = readFileSync(iconPath, 'base64')
const iconHref = 'data:image/svg+xml;base64,' + iconData

export const metadata: Metadata = {
    title: 'GalSkill',
    description: 'Tracing a girl\'s heartbeat into skills.',
    icons: {
        icon: iconHref,
    },
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

