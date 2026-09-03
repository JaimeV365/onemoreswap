import type { AlbumIndexes, ParsedCounts } from './types'

/**
 * Tokenise paste lists. Accept common separators collectors use:
 *   CIV: 11
 *   MEX: 1, 2,14
 *   KOR 3
 *   ESP - 8
 *   ENG5 ENG7
 *   MEX3X2 / 570×2
 */
function tokenizeStickerInput(raw: string): string[] {
  return raw
    .replace(/[×*]/g, 'X')
    .replace(/([A-Z0-9]{2,4}\d{1,2})X(\d{1,2})\b/gi, '$1 X$2')
    .replace(/(\d{1,4})X(\d{1,2})\b/gi, '$1 X$2')
    .replace(/[,;|/\\]+/g, ' ')
    .replace(/[:\-–—=.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((t) => t.toUpperCase())
}

function peekMultiplier(tokens: string[], i: number) {
  const next = tokens[i + 1]
  if (!next) return { mult: 1, skip: 0 }
  const m = next.match(/^X(\d{1,2})$/)
  if (!m) return { mult: 1, skip: 0 }
  const n = parseInt(m[1], 10)
  if (n < 1) return { mult: 1, skip: 0 }
  return { mult: Math.min(n, 99), skip: 1 }
}

export function parseStickerInput(raw: string, indexes: AlbumIndexes): ParsedCounts {
  const counts = new Map<number, number>()
  const unknown: string[] = []
  const tokens = tokenizeStickerInput(raw)
  if (!tokens.length) return { counts, unknown }

  let lastCode: string | null = null

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (/^X\d+$/.test(tok)) {
      unknown.push(tok)
      continue
    }

    if (/^\d+$/.test(tok)) {
      const n = parseInt(tok, 10)
      const { mult, skip } = peekMultiplier(tokens, i)

      if (lastCode && n >= 1 && n <= 99) {
        const seq = indexes.codeToSeq.get(`${lastCode}${n}`)
        if (seq !== undefined) {
          counts.set(seq, (counts.get(seq) ?? 0) + mult)
        } else {
          unknown.push(tok)
        }
        i += skip
      } else if (indexes.seqToInfo.has(n)) {
        counts.set(n, (counts.get(n) ?? 0) + mult)
        lastCode = null
        i += skip
      } else {
        unknown.push(tok)
      }
    } else if (/^[A-Z0-9]{2,4}\d{1,2}$/.test(tok)) {
      // ENG5, MEX12, 001 (album opening card) etc.
      const cm = tok.match(/^([A-Z0-9]{2,4})(\d{1,2})$/)!
      const code = cm[1]
      const cardNum = parseInt(cm[2], 10)
      const seq = indexes.codeToSeq.get(`${code}${cardNum}`)
      const { mult, skip } = peekMultiplier(tokens, i)
      if (seq !== undefined) {
        counts.set(seq, (counts.get(seq) ?? 0) + mult)
        lastCode = code
        i += skip
      } else {
        unknown.push(tok)
      }
    } else if (/^[A-Z0-9]{2,4}$/.test(tok) && indexes.teamCodes.has(tok)) {
      lastCode = tok
    } else {
      unknown.push(tok)
    }
  }

  return { counts, unknown }
}

export function countsToText(counts: Map<number, number>, indexes: AlbumIndexes): string {
  const byCode: Record<string, number[]> = {}
  for (const [seq, qty] of counts) {
    const info = indexes.seqToInfo.get(seq)
    if (!info) continue
    if (!byCode[info.code]) byCode[info.code] = []
    for (let i = 0; i < qty; i++) byCode[info.code].push(info.cardNum)
  }
  return Object.entries(byCode)
    .map(([code, nums]) => `${code}: ${nums.sort((a, b) => a - b).join(', ')}`)
    .join('\n')
}
