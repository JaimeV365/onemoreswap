/**
 * Extract WC 2026 sticker catalogue from world-cup-2026-sticker-tracker index.html
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const altPath = 'C:/Users/jaime/OneDrive/Documents/world-cup-2026-sticker-tracker/index.html'
const html = readFileSync(altPath, 'utf8')

function extractConst(name) {
  const marker = `const ${name} =`
  const start = html.indexOf(marker)
  if (start === -1) throw new Error(`Missing ${name}`)
  let i = start + marker.length
  while (html[i] === ' ' || html[i] === '\n') i++
  const opener = html[i]
  const closer = opener === '[' ? ']' : '{'
  const closeChar = opener === '[' ? ']' : '}'
  let depth = 0
  for (let j = i; j < html.length; j++) {
    const ch = html[j]
    if (ch === opener) depth++
    else if (ch === closeChar) {
      depth--
      if (depth === 0) return html.slice(i, j + 1)
    }
  }
  throw new Error(`Unclosed ${name}`)
}

const albumOrder = eval(`(${extractConst('albumOrder')})`)
const players = eval(`(${extractConst('players')})`)
const specialSections = eval(`(${extractConst('specialSections')})`)

function teamPages(slot) {
  let start = 8 + (slot - 1) * 2
  if (slot >= 25) start += 2
  return [start, start + 1]
}

const foilPos = new Set([1])
const stickers = []

albumOrder.forEach(([slot, code, name]) => {
  const start = 10 + (slot - 1) * 20
  const pages = teamPages(slot)
  players[code].forEach((playerName, i) => {
    const cardNum = i + 1
    const seq = start + i
    stickers.push({
      seq,
      code,
      cardNum,
      name: playerName,
      section: name,
      foil: foilPos.has(cardNum),
      pages,
    })
  })
})

specialSections.forEach((sec) => {
  sec.stickers.forEach((s) => {
    const infoCode = sec.code === 'HIS' ? 'FWC' : sec.code
    const pages = s.page != null ? [s.page, s.page] : sec.pages
    stickers.push({
      seq: s.seq,
      code: infoCode,
      cardNum: s.cardNum,
      name: s.name,
      section: sec.name,
      foil: !!s.foil,
      pages,
    })
  })
})

const out = {
  id: 'wc2026',
  name: 'World Cup 2026',
  manufacturer: 'Panini',
  accent: 'wc',
  total: stickers.length,
  stickers,
}

const outPath = join(root, '..', 'src', 'data', 'wc2026-catalogue.json')
writeFileSync(outPath, JSON.stringify(out))
console.log(`Written ${stickers.length} stickers to ${outPath}`)
