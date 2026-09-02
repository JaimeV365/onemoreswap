/**
 * Generate Premier League 2025/26 catalogue (Topps — team codes + numeric slots).
 * Player names are placeholders until full catalogue is curated.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

const teams = [
  ['ARS', 'Arsenal'],
  ['AVL', 'Aston Villa'],
  ['BOU', 'Bournemouth'],
  ['BRE', 'Brentford'],
  ['BHA', 'Brighton'],
  ['CHE', 'Chelsea'],
  ['CRY', 'Crystal Palace'],
  ['EVE', 'Everton'],
  ['FUL', 'Fulham'],
  ['IPS', 'Ipswich Town'],
  ['LEI', 'Leicester City'],
  ['LIV', 'Liverpool'],
  ['MCI', 'Manchester City'],
  ['MUN', 'Manchester United'],
  ['NEW', 'Newcastle United'],
  ['NFO', 'Nottingham Forest'],
  ['SOU', 'Southampton'],
  ['TOT', 'Tottenham Hotspur'],
  ['WHU', 'West Ham United'],
  ['WOL', 'Wolverhampton Wanderers'],
]

const STICKERS_PER_TEAM = 32
const stickers = []
let seq = 1

teams.forEach(([code, name]) => {
  for (let cardNum = 1; cardNum <= STICKERS_PER_TEAM; cardNum++) {
    const labels = [
      'Team badge',
      'Home kit',
      'Away kit',
      'Third kit',
      'Team photo',
    ]
    const label =
      cardNum <= labels.length
        ? labels[cardNum - 1]
        : `Player ${cardNum - labels.length}`
    stickers.push({
      seq,
      code,
      cardNum,
      name: label,
      section: name,
      foil: cardNum === 1,
    })
    seq++
  }
})

// League specials (numbered PL1–PL18 style in album)
for (let cardNum = 1; cardNum <= 18; cardNum++) {
  stickers.push({
    seq,
    code: 'PL',
    cardNum,
    name: `Premier League special ${cardNum}`,
    section: 'Premier League',
    foil: true,
  })
  seq++
}

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
