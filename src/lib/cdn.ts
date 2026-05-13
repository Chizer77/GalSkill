const SPEED_TEST_KEY = 'galskill_cdn_ranking'
const SPEED_TEST_CACHE_TTL = 86_400_000 // 24h
const SPEED_TEST_TIMEOUT = 3000

interface CDNRanking {
    urls: string[]
    timestamp: number
}

/** Shared origin ranking set by first rankUrls() call */
let originRanking: string[] | null = null

function getOrigin(url: string): string {
    try { return new URL(url).origin } catch { return url }
}

/**
 * Parse JSON array env var to string array, or return [] on invalid/missing
 */
export function parseCDNUrls(envVar: string | undefined): string[] {
    if (!envVar) return []
    try {
        const parsed = JSON.parse(envVar)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* fall through */ }
    return []
}

/**
 * Rank URLs by speed (first call triggers HEAD test, subsequent calls
 * reorder to match the established origin ranking). Shared across all
 * callers so index + info requests prefer the same CDN.
 */
export async function rankUrls(urls: string[]): Promise<string[]> {
    if (urls.length <= 1) return urls

    if (!originRanking) {
        const ranked = await doSpeedTest(urls)
        originRanking = ranked.map(getOrigin)
        return ranked
    }

    return reorderByOrigin(urls)
}

/**
 * Try each baseUrl in order, return the first successful response.
 * Uses shared ranking to determine order.
 */
export async function fetchWithFallback(
    baseUrls: string[],
    path: string,
    options?: RequestInit
): Promise<Response> {
    const ordered = await rankUrls(baseUrls)
    let lastError: Error | null = null

    for (const baseUrl of ordered) {
        try {
            const response = await fetch(`${baseUrl}/${path}`, options)
            if (response.ok || response.status === 206) return response
            lastError = new Error(`HTTP error! status: ${response.status}`)
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
        }
    }

    throw lastError || new Error('All CDNs failed')
}

async function doSpeedTest(urls: string[]): Promise<string[]> {
    const cached = readCache()
    if (cached) return cached

    const results = await Promise.allSettled(
        urls.map(url => pingCDN(url))
    )

    const scored: Array<{ url: string; time: number }> = []
    for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (r.status === 'fulfilled' && r.value !== null) {
            scored.push({ url: urls[i], time: r.value })
        }
    }

    scored.sort((a, b) => a.time - b.time)
    const ranked = scored.map(s => s.url)
    const failed = urls.filter(u => !ranked.includes(u))
    const finalOrder = [...ranked, ...failed]

    writeCache(finalOrder)
    return finalOrder
}

async function pingCDN(url: string): Promise<number | null> {
    try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), SPEED_TEST_TIMEOUT)
        const start = performance.now()
        const response = await fetch(`${url}/master.json`, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
        })
        clearTimeout(id)
        return response.ok ? performance.now() - start : null
    } catch {
        return null
    }
}

function reorderByOrigin(urls: string[]): string[] {
    return [...urls].sort((a, b) => {
        const ai = originRanking!.indexOf(getOrigin(a))
        const bi = originRanking!.indexOf(getOrigin(b))
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
}

function readCache(): string[] | null {
    try {
        const raw = localStorage.getItem(SPEED_TEST_KEY)
        if (!raw) return null
        const parsed: CDNRanking = JSON.parse(raw)
        if (Date.now() - parsed.timestamp < SPEED_TEST_CACHE_TTL) {
            return parsed.urls
        }
    } catch { /* ignore */ }
    return null
}

function writeCache(urls: string[]): void {
    try {
        localStorage.setItem(SPEED_TEST_KEY, JSON.stringify({
            urls,
            timestamp: Date.now()
        }))
    } catch { /* storage full */ }
}
