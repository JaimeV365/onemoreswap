/**
 * Build Premier League 2025/26 catalogue from the Official Stickers 2026 checklist.
 * Source: Football Cartophilic Info Exchange (album numbers 1–561).
 * Run: node scripts/generate-pl-catalogue.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

/** Club name as written in the checklist → [code, section display name] */
const CLUBS = {
  Arsenal: ['ARS', 'Arsenal'],
  'Aston Villa': ['AVL', 'Aston Villa'],
  'AFC Bournemouth': ['BOU', 'Bournemouth'],
  Brentford: ['BRE', 'Brentford'],
  'Brighton & Hove Albion': ['BHA', 'Brighton'],
  Burnley: ['BUR', 'Burnley'],
  Chelsea: ['CHE', 'Chelsea'],
  'Crystal Palace': ['CRY', 'Crystal Palace'],
  Everton: ['EVE', 'Everton'],
  Fulham: ['FUL', 'Fulham'],
  'Leeds United': ['LEE', 'Leeds United'],
  Liverpool: ['LIV', 'Liverpool'],
  'Manchester City': ['MCI', 'Manchester City'],
  'Manchester United': ['MUN', 'Manchester United'],
  'Newcastle United': ['NEW', 'Newcastle United'],
  'Nottingham Forest': ['NFO', 'Nottingham Forest'],
  Sunderland: ['SUN', 'Sunderland'],
  'Tottenham Hotspur': ['TOT', 'Tottenham Hotspur'],
  'West Ham United': ['WHU', 'West Ham United'],
  'Wolverhampton Wanderers': ['WOL', 'Wolverhampton Wanderers'],
}

const SPECIAL_SECTIONS = {
  Introduction: ['INT', 'Introduction'],
  'Premier League Hall of Fame': ['HOF', 'Hall of Fame'],
  'Trailblazers 1992-2026': ['TBL', 'Trailblazers'],
  'Dominant Duos': ['DUO', 'Dominant Duos'],
  'Divine 9': ['DIV', 'Divine 9'],
}

function stripDiacriticsNote(raw) {
  return raw
    .replace(/\s*-\s*added\s+\d{2}-\d{2}-\d{4}\s*$/i, '')
    .trim()
}

function parseNamedLine(rest, currentSpecial) {
  const badge = rest.match(/^Club Badge\s*\((.+)\)$/i)
  if (badge) {
    const club = badge[1].trim()
    const mapped = CLUBS[club]
    if (!mapped) throw new Error(`Unknown club badge: ${club}`)
    return { code: mapped[0], section: mapped[1], name: 'Club badge', foil: true }
  }

  const withClub = rest.match(/^(.+?)\s*\((.+)\)\s*(?:-\s*(.+))?$/)
  if (withClub) {
    const player = withClub[1].trim()
    const club = withClub[2].trim()
    const suffix = withClub[3]?.trim()
    const mapped = CLUBS[club]
    const name = suffix ? `${player} (${suffix})` : player
    const foil = Boolean(
      suffix &&
        /Premier|Living Legacy|Prime Prospect|Dynamic King|Defensive King|Midfield Maestro|Attacking Ace|Captain/i.test(
          suffix,
        ),
    )

    // Special subsets keep their own album section even when a club is named
    if (currentSpecial && currentSpecial[0] !== 'INT') {
      return {
        code: currentSpecial[0],
        section: currentSpecial[1],
        name: mapped ? `${name} · ${mapped[1]}` : name,
        foil: true,
      }
    }

    if (!mapped) throw new Error(`Unknown club in: ${rest}`)
    return { code: mapped[0], section: mapped[1], name, foil }
  }

  if (currentSpecial) {
    const [code, section] = currentSpecial
    return {
      code,
      section,
      name: rest,
      foil: code === 'HOF' || code === 'DIV' || code === 'TBL' || code === 'INT',
    }
  }

  return { code: 'INT', section: 'Introduction', name: rest, foil: false }
}

const raw = readFileSync(join(root, 'pl2526-checklist-source.txt'), 'utf8')
const lines = raw.split(/\r?\n/)

const byNum = new Map()
let currentSpecial = SPECIAL_SECTIONS.Introduction
let pastAlbum = false

/** Checklist gaps filled from subset cross-refs (source omitted a line). */
const MANUAL = {
  442: 'Chris Wood (Nottingham Forest)',
}

for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed) continue
  if (/^PARALLEL:/i.test(trimmed)) continue
  if (/^Kick Off/i.test(trimmed)) break
  if (/^Completion Sticker/i.test(trimmed)) break
  if (/^NNO\./i.test(trimmed)) break

  if (SPECIAL_SECTIONS[trimmed]) {
    currentSpecial = SPECIAL_SECTIONS[trimmed]
    continue
  }
  if (/^Premier League 2025\/26/i.test(trimmed)) {
    currentSpecial = null
    continue
  }
  // Index / subset re-lists after the main album (Captain, Attacking Ace, …)
  if (
    /^(Captain|Attacking Ace|Defensive King|Living Legacy|Midfield Maestro|Premier|Prime Prospect)$/i.test(
      trimmed,
    )
  ) {
    pastAlbum = true
    continue
  }
  if (/^Divine 9$/i.test(trimmed)) {
    pastAlbum = false
    currentSpecial = SPECIAL_SECTIONS['Divine 9']
    continue
  }

  const m = trimmed.match(/^(\d+)\.\s+(.+)$/)
  if (!m) continue
  const num = Number(m[1])
  const rest = stripDiacriticsNote(m[2])
  if (num < 1 || num > 561) continue
  if (byNum.has(num)) continue // keep first (main checklist), skip index duplicates
  if (pastAlbum && num < 553) continue

  const clubbed = parseNamedLine(rest, currentSpecial)
  byNum.set(num, {
    seq: num,
    code: clubbed.code,
    cardNum: num,
    name: clubbed.name,
    section: clubbed.section,
    foil: clubbed.foil,
  })
}

for (const [num, rest] of Object.entries(MANUAL)) {
  const n = Number(num)
  if (byNum.has(n)) continue
  const clubbed = parseNamedLine(stripDiacriticsNote(rest), null)
  byNum.set(n, {
    seq: n,
    code: clubbed.code,
    cardNum: n,
    name: clubbed.name,
    section: clubbed.section,
    foil: clubbed.foil,
  })
}

const missing = []
for (let i = 1; i <= 561; i++) {
  if (!byNum.has(i)) missing.push(i)
}
if (missing.length) {
  console.error(`Missing sticker numbers: ${missing.join(', ')}`)
  process.exit(1)
}

const stickers = [...byNum.values()].sort((a, b) => a.seq - b.seq)
const out = {
  id: 'pl2526',
  name: 'Premier League 2025/26',
  manufacturer: 'Topps',
  accent: 'pl',
  total: stickers.length,
  stickers,
}

const outPath = join(root, '..', 'src', 'data', 'pl2526-catalogue.json')
writeFileSync(outPath, JSON.stringify(out))
console.log(`Written ${stickers.length} stickers to ${outPath}`)
console.log(
  `Sections: ${[...new Set(stickers.map((s) => s.section))].length}; foils: ${
    stickers.filter((s) => s.foil).length
  }`,
)
