import Dexie, { Table } from 'dexie'
import { fetchWithFallback, parseCDNUrls, rankUrls } from './cdn'

export interface SearchIndex {
    id?: number
    keywords: string[]
    offset: number
    length: number
    file: string
}

export interface LoadedShard {
    char: string
    shardFile: string
    loaded: number // 0: pending, 1: loaded
}

export interface CharacterData {
    id: string
    zh?: string[]
    ja?: string[]
    en?: string[]
    kana?: string[]
    nick_name?: string[]
    gender?: string
    subjects?: Array<{
        id?: string
        name?: string
        zh_name?: string
        type?: number
        role_type?: number
    }>
    info?: {
        vndb_id?: string
        bloodt?: string
        cup?: string
        height?: number
        weight?: number
        age?: string
        bwh?: string
        birthday?: string
        traits?: Record<string, string[]>
    }
    tags?: string[]
    summary?: string
}

class GalSkillDB extends Dexie {
    searchIndex!: Table<SearchIndex>
    characterCache!: Table<{ id?: string; data?: CharacterData }>
    loadedShards!: Table<LoadedShard>

    constructor() {
        super('GalSkillDB')
        this.version(3).stores({
            searchIndex: '++id, *keywords',
            characterCache: 'id',
            loadedShards: 'char, shardFile, loaded'
        })
    }
}

export const db = new GalSkillDB()

const GALSKILL_VERSION_KEY = 'galskill_index_version'

let rankedIndexUrls: string[] | null = null

async function getIndexUrls(): Promise<string[]> {
    if (rankedIndexUrls) return rankedIndexUrls
    const urls = parseCDNUrls(process.env.NEXT_PUBLIC_INDEX_BASE_URLS)
    rankedIndexUrls = await rankUrls(urls)
    return rankedIndexUrls
}

const loadingShards = new Set<string>()

/**
 * Initializes and loads the master index
 */
export async function loadSearchIndex(
    onProgress?: (loaded: number, total: number) => void
): Promise<void> {
    if (!db.isOpen()) {
        await db.open()
    }

    try {
        const urls = await getIndexUrls()
        const response = await fetchWithFallback(urls, 'master.json', { cache: 'no-cache' })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const { v: version, m: masterIndex }: { v: string; m: Record<string, string> } = await response.json()
        const storedVersion = localStorage.getItem(GALSKILL_VERSION_KEY)
        const existingCount = await db.loadedShards.count()

        // If version mismatch OR database is empty, initialize
        if (storedVersion !== version || existingCount === 0) {
            await db.transaction('rw', db.searchIndex, db.characterCache, db.loadedShards, async () => {
                await db.searchIndex.clear()
                await db.characterCache.clear()
                await db.loadedShards.clear()

                const shards = Object.entries(masterIndex).map(([char, shardFile]) => ({
                    char: char.toLowerCase(),
                    shardFile,
                    loaded: 0
                }))
                await db.loadedShards.bulkAdd(shards)
            })
            localStorage.setItem(GALSKILL_VERSION_KEY, version)
            console.info(`Master index initialized to version ${version}`)
        }

        // Start background download
        startBackgroundDownload(onProgress)
    } catch (error) {
        console.error('Failed to load master index:', error)
        const existingCount = await db.loadedShards.count()
        if (existingCount === 0) throw error
    }
}

let isDownloading = false
/**
 * Silently download all shards in the background
 */
async function startBackgroundDownload(
    onProgress?: (loaded: number, total: number) => void
) {
    if (isDownloading) return
    isDownloading = true

    try {
        const pendingShards = await db.loadedShards.where('loaded').equals(0).toArray()
        const total = await db.loadedShards.count()
        let loaded = total - pendingShards.length

        for (const shard of pendingShards) {
            // Re-check in case it was loaded by a search request
            const current = await db.loadedShards.get(shard.char)
            if (current?.loaded === 1) continue

            const success = await loadShard(shard)
            if (success) {
                loaded++
                onProgress?.(loaded, total)
            }
            // Small delay to avoid blocking the UI thread too much
            await new Promise(resolve => setTimeout(resolve, 50))
        }
    } catch (error) {
        console.error('Background download failed:', error)
    } finally {
        isDownloading = false
    }
}

/**
 * Loads a single shard into the database
 * @returns true if the shard was successfully loaded, false otherwise
 */
async function loadShard(shard: LoadedShard): Promise<boolean> {
    if (loadingShards.has(shard.char)) return false
    loadingShards.add(shard.char)

    try {
        const primaryUrl = (rankedIndexUrls ?? parseCDNUrls(process.env.NEXT_PUBLIC_INDEX_BASE_URLS))[0]
        const response = await fetch(`${primaryUrl}/${shard.shardFile}`)
        if (!response.ok) throw new Error(`Failed to fetch shard ${shard.shardFile}`)

        const { d: data }: { d: Array<{ k: string[]; f: string; o: number; l: number }> } = await response.json()

        await db.transaction('rw', db.searchIndex, db.loadedShards, async () => {
            // Double check inside transaction
            const current = await db.loadedShards.get(shard.char)
            if (current?.loaded === 1) return

            await db.searchIndex.bulkAdd(
                data.map(item => ({
                    keywords: item.k,
                    file: item.f,
                    offset: item.o,
                    length: item.l
                }))
            )
            await db.loadedShards.update(shard.char, { loaded: 1 })
        })
        return true
    } catch (error) {
        console.error(`Failed to load shard ${shard.shardFile}:`, error)
        return false
    } finally {
        loadingShards.delete(shard.char)
    }
}

/**
 * Ensures a shard for a specific character is loaded
 */
export async function ensureShardLoaded(char: string): Promise<void> {
    const shard = await db.loadedShards.get(char.toLowerCase())
    if (shard && shard.loaded === 0) {
        await loadShard(shard)
    }
}

/**
 * Searches characters by keyword
 */
export async function searchCharacters(query: string, limit = 20): Promise<SearchIndex[]> {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []

    // Ensure the shard for the first character is loaded
    const firstChar = trimmed[0]
    await ensureShardLoaded(firstChar)

    return db.searchIndex
        .where('keywords')
        .startsWith(trimmed)
        .limit(limit)
        .distinct()
        .toArray()
}

/**
 * Cache management
 */
export const CharacterCache = {
    async get(id: string): Promise<CharacterData | null> {
        const cached = await db.characterCache.get(id)
        return cached?.data || null
    },

    async set(id: string, data: CharacterData): Promise<void> {
        await db.characterCache.put({ id, data })
    },

    async clear(): Promise<void> {
        await db.characterCache.clear()
    }
}
