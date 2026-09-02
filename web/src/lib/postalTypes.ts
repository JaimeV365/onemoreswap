export type PostalLineStatus = 'pending' | 'received' | 'written_off'

export type PostalSentLine = {
  seq: number
  qty: number
}

export type PostalExpectedLine = {
  seq: number
  qty: number
  status: PostalLineStatus
}

export type PostalSwap = {
  id: string
  albumId: string
  status: 'open' | 'completed'
  person: string
  source: string
  notes: string
  postedDate: string
  createdAt: string
  completedAt: string | null
  sent: PostalSentLine[]
  expected: PostalExpectedLine[]
}

export type PostalStore = {
  version: 1
  swaps: PostalSwap[]
}
