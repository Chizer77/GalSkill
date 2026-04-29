import { CharacterData } from './db'

const DATA_BASE_URL = process.env.NEXT_PUBLIC_INFO_BASE_URL

export async function fetchCharacterByRange(
    file: string,
    offset: number,
    length: number
): Promise<CharacterData | null> {
    try {
        const endOffset = offset + length - 1
        const response = await fetch(`${DATA_BASE_URL}/${file}`, {
            headers: {
                'Range': `bytes=${offset}-${endOffset}`
            }
        })

        if (!response.ok && response.status !== 206) {
            console.error(`Range request failed with status: ${response.status} for file ${file}`)
            return null
        }

        const text = await response.text()
        const trimmedText = text.trim()

        if (!trimmedText) {
            console.error('Empty response from Range request')
            return null
        }

        const data = JSON.parse(trimmedText) as CharacterData
        return data
    } catch (error) {
        console.error('Failed to fetch character by range:', error)
        return null
    }
}

export async function fetchMultipleCharacters(
    requests: Array<{ file: string; offset: number; length: number }>
): Promise<(CharacterData | null)[]> {
    const promises = requests.map(req => fetchCharacterByRange(req.file, req.offset, req.length))
    return Promise.all(promises)
}
