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

export function hasTeamFlagMap(codes: Iterable<string>): boolean {
  for (const code of codes) {
    if (Object.prototype.hasOwnProperty.call(TEAM_FLAG_ISO, code)) return true
  }
  return false
}

export function flagImageUrl(code: string, width = 40): string | null {
  const iso = TEAM_FLAG_ISO[code]
  if (!iso) return null
  return `https://flagcdn.com/w${width}/${iso}.png`
}

export function sectionDomId(sectionKey: string): string {
  return `album-sec-${sectionKey.replace(/[^a-zA-Z0-9]+/g, '-')}`
}
