'use client'

import { motion } from 'framer-motion'

interface SpinnerProps {
    className?: string
}

export default function Spinner({ className = 'w-4 h-4' }: SpinnerProps) {
    return (
        <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={`${className} border-2 border-white/30 border-t-white rounded-full inline-block`}
        />
    )
}
