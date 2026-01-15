const API_BASE = '/api'

export const api = {
  async getQuotes() {
    const res = await fetch(`${API_BASE}/quotes`)
    return res.json()
  },

  async createQuote(data: QuoteInput) {
    const res = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  async getClients() {
    const res = await fetch(`${API_BASE}/clients`)
    return res.json()
  },

  async createClient(data: ClientInput) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },
}

export interface QuoteInput {
  clientId?: number
  eventType: string
  locationZip: string
  numGuards: number
  hours: number
  eventDate: string
  isArmed?: boolean
  requiresVehicle?: boolean
  crowdSize?: number
}

export interface ClientInput {
  companyName: string
  contactName?: string
  email: string
  phone?: string
  city?: string
  state?: string
  zipCode?: string
}
