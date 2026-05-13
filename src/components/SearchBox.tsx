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
    const [shardProgress, setShardProgress] = useState({ loaded: 0, total: 0 })

    useEffect(() => {
        const init = async (retries = 1) => {
            try {
                await loadSearchIndex((loaded, total) => {
                    setShardProgress({ loaded, total })
                })
                setDbStatus('ready')
            } catch {
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
        <motion.section
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
        >
            <div className={`relative transition-opacity duration-700 ${dbStatus === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                    type="text"
                    value={query}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={dbStatus === 'ready' ? '搜索角色名称 / Bangumi ID / 相关作品名...' : '索引初始化中…'}
                    disabled={dbStatus !== 'ready'}
                    className="gs-input text-base"
                    aria-label="搜索角色"
                />
                {isSearching && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className="absolute right-3 inset-y-0 my-auto w-3 h-3 border-2 rounded-full border-brand border-t-transparent"
                        aria-hidden="true"
                    />
                )}
                <AnimatePresence>
                    {dbStatus === 'ready' && shardProgress.total > 0 && shardProgress.loaded < shardProgress.total && !isSearching && (
                        <motion.div
                            key="ink-indicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }}
                            className="absolute right-3 inset-y-0 my-auto flex items-center gap-1.5"
                        >
                            <motion.span
                                className="w-1.5 h-1.5 rounded-full bg-brand"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <span className="text-[11px] text-stone font-sans whitespace-nowrap">
                                {shardProgress.loaded}/{shardProgress.total}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {dbStatus === 'loading' && (
                <motion.p
                    className="mt-2 text-xs text-center font-serif text-stone"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    索引初始化中…
                </motion.p>
            )}
            {dbStatus === 'error' && (
                <p className="mt-2 text-xs text-center text-red-500">索引加载失败，请刷新页面重试</p>
            )}

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.ul
                        variants={EXPAND_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="mt-3 space-y-1"
                    >
                        {results.map((item, i) => (
                            <li key={`${item.offset}-${i}`}>
                                <button
                                    onClick={() => handleSelect(item)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-serif text-base
                                        ${selectedIndex === i ? 'bg-tag-bg' : 'hover:bg-tag-bg'}`}
                                >
                                    {item.keywords[0]}
                                    {item.keywords[1] && (
                                        <span className="ml-2 text-sm text-olive">
                                            {item.keywords[1]}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>

            {query && !isSearching && results.length === 0 && dbStatus === 'ready' && (
                <p className="text-center text-sm mt-3 text-stone">未找到匹配角色</p>
            )}
        </motion.section>
    )
}
