'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchCharacters, loadSearchIndex, CharacterData, SearchIndex, CharacterCache } from '@/lib/db'
import { fetchCharacterByRange } from '@/lib/rangeFetcher'
import { SECTION_VARIANTS, EXPAND_VARIANTS } from '@/lib/animations'

interface SearchBoxProps {
    onCharacterSelect: (character: CharacterData) => void
}

export default function SearchBox({ onCharacterSelect }: SearchBoxProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchIndex[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading')

    useEffect(() => {
        const init = async (retries = 1) => {
            try {
                await loadSearchIndex()
                setDbStatus('ready')
            } catch (err) {
                if (retries > 0) return init(retries - 1)
                setDbStatus('error')
            }
        }
        init()
    }, [])

    const handleSelect = useCallback(async (item: SearchIndex) => {
        const cacheId = `${item.file}-${item.offset}-${item.length}`
        const cached = await CharacterCache.get(cacheId)

        if (cached) {
            onCharacterSelect(cached)
        } else {
            const character = await fetchCharacterByRange(item.file, item.offset, item.length)
            if (character) {
                await CharacterCache.set(cacheId, character)
                onCharacterSelect(character)
            }
        }

        setQuery('')
        setResults([])
        setSelectedIndex(-1)
    }, [onCharacterSelect])

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!query.trim()) return setResults([])
            setIsSearching(true)
            try {
                const res = await searchCharacters(query.toLowerCase(), 20)
                setResults(res)
                setSelectedIndex(-1)
            } finally {
                setIsSearching(false)
            }
        }, 300)
        return () => clearTimeout(handler)
    }, [query])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') setSelectedIndex(p => Math.min(p + 1, results.length - 1))
        if (e.key === 'ArrowUp') setSelectedIndex(p => Math.max(p - 1, -1))
        if (e.key === 'Enter' && selectedIndex >= 0) handleSelect(results[selectedIndex])
    }

    return (
        <motion.div
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            className="space-y-6"
        >
            <div className="relative group">
                <input
                    type="text" value={query} onKeyDown={handleKeyDown}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={dbStatus === 'ready' ? "搜索角色名称/Bangumi ID/相关作品名..." : "Loading records..."}
                    disabled={dbStatus !== 'ready'}
                    className="w-full px-5 py-3 text-lg placeholder:text-base bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 font-serif focus:border-accent-light transition-all"
                />
                {isSearching && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <motion.div
                            animate={{ rotate: 360, opacity: [0.2, 0.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            className="w-3 h-3 border-t border-accent-light/40 rounded-full"
                        />
                    </div>
                )}
            </div>
            {dbStatus === 'loading' && <p className="mt-1 text-xs opacity-50 italic text-center">索引加载中...</p>}
            {dbStatus === 'error' && <p className="mt-1 text-xs italic text-center text-red-500">索引加载失败，请刷新</p>}

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.ul
                        variants={EXPAND_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="border-gray-100 dark:border-gray-800"
                    >
                        {results.map((item, i) => (
                            <li key={`${item.offset}-${i}`}>
                                <button
                                    onClick={() => handleSelect(item)}
                                    className={`w-full text-left px-4 py-3 font-serif text-lg transition-colors
                                        ${selectedIndex === i ? 'bg-accent-light/10' : 'hover:bg-accent-light/5'}`}
                                >
                                    {item.keywords[0]}
                                    {item.keywords[1] && <span className="ml-2 text-sm opacity-40 font-sans">{item.keywords[1]}</span>}
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>

            {query && !isSearching && results.length === 0 && dbStatus === 'ready' && (
                <p className="text-center text-sm italic opacity-50">未找到匹配角色</p>
            )}
        </motion.div>
    )
}