/** Album section code → flagcdn ISO (home nations use gb-eng / gb-sct). */
export const TEAM_FLAG_ISO: Record<string, string | null> = {
  MEX: 'mx',
  RSA: 'za',
  KOR: 'kr',
  CZE: 'cz',
  CAN: 'ca',
  BIH: 'ba',
  QAT: 'qa',
  SUI: 'ch',
  BRA: 'br',
  HAI: 'ht',
  MAR: 'ma',
  SCO: 'gb-sct',
  AUS: 'au',
  PAR: 'py',
  TUR: 'tr',
  USA: 'us',
  CUW: 'cw',
  ECU: 'ec',
  GER: 'de',
  CIV: 'ci',
  JPN: 'jp',
  NED: 'nl',
  SWE: 'se',
  TUN: 'tn',
  BEL: 'be',
  EGY: 'eg',
  IRN: 'ir',
  NZL: 'nz',
  ESP: 'es',
  CPV: 'cv',
  KSA: 'sa',
  URU: 'uy',
  FRA: 'fr',
  IRQ: 'iq',
  NOR: 'no',
  SEN: 'sn',
  ALG: 'dz',
  ARG: 'ar',
  AUT: 'at',
  JOR: 'jo',
  COL: 'co',
  COD: 'cd',
  POR: 'pt',
  UZB: 'uz',
  CRO: 'hr',
  ENG: 'gb-eng',
  GHA: 'gh',
  PAN: 'pa',
  '00': null,
  FWC: null,
  CC: null,
  HIS: null,
}

/** WC26 album nation order (48 teams). CC sits after the first 24 in the physical album. */
export const WC_NATION_ORDER = [
  'MEX',
  'RSA',
  'KOR',
  'CZE',
  'CAN',
  'BIH',
  'QAT',
  'SUI',
  'BRA',
  'MAR',
  'HAI',
  'SCO',
  'USA',
  'PAR',
  'AUS',
  'TUR',
  'GER',
  'CUW',
  'CIV',
  'ECU',
  'NED',
  'JPN',
  'SWE',
  'TUN',
  'BEL',
  'EGY',
  'IRN',
  'NZL',
  'ESP',
  'CPV',
  'KSA',
  'URU',
  'FRA',
  'SEN',
  'IRQ',
  'NOR',
  'ARG',
  'ALG',
  'AUT',
  'JOR',
  'POR',
  'COD',
  'UZB',
  'COL',
  'ENG',
  'CRO',
  'GHA',
  'PAN',
] as const

/**
 * Premier League club codes → ESPN soccer team logo IDs.
 * Crests load from ESPN’s public CDN (free to hotlink for display; trademarks remain with clubs).
 */
export const PL_CREST_ESPN_ID: Record<string, number> = {
  ARS: 359,
  AVL: 362,
  BOU: 349,
  BRE: 337,
  BHA: 331,
  CHE: 363,
  CRY: 384,
  EVE: 368,
  FUL: 370,
  IPS: 372,
  LEI: 375,
  LIV: 364,
  MCI: 382,
  MUN: 360,
  NEW: 361,
  NFO: 393,
  SOU: 376,
  TOT: 367,
  WHU: 371,
  WOL: 380,
}

export function hasSectionMarks(albumId: string, codes: Iterable<string>): boolean {
  if (albumId === 'wc2026') {
    for (const code of codes) {
      if (Object.prototype.hasOwnProperty.call(TEAM_FLAG_ISO, code)) return true
    }
  }
  if (albumId === 'pl2526') {
    for (const code of codes) {
      if (PL_CREST_ESPN_ID[code] || code === 'PL') return true
    }
  }
  return false
}

export function sectionImageUrl(albumId: string, code: string, width = 40): string | null {
  if (albumId === 'wc2026') {
    const iso = TEAM_FLAG_ISO[code]
    if (!iso) return null
    return `https://flagcdn.com/w${width}/${iso}.png`
  }
  if (albumId === 'pl2526') {
    const id = PL_CREST_ESPN_ID[code]
    if (!id) return null
    return `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`
  }
  return null
}

export function sectionDomId(sectionKey: string): string {
  return `album-sec-${sectionKey.replace(/[^a-zA-Z0-9]+/g, '-')}`
}
