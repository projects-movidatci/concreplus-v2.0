/**
 * Shared types for ConcrePlus modules (Clientes, Obras, Cotizaciones, Pedidos, etc.)
 * Aligned with database schema (English) and UI (Spanish where needed).
 */

export type ClientStatus = 'active' | 'inactive'
export type CreditType = 'cash' | '15_days'
export type WorkStatus = 'active' | 'inactive'
export type QuoteStatus = 'draft' | 'sent' | 'approved'
export type OrderStatus = 'pending' | 'scheduled' | 'dispatched' | 'delivered'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'

export interface Client {
    id: number
    name: string
    contactName: string
    phone: string
    email: string
    creditType: CreditType
    balancePending: number
    worksCount: number
    status: ClientStatus
}

export interface Work {
    id: number
    clientId: number
    name: string
    address: string
    status: WorkStatus
    ordersCount: number
    progress: number
}

/** Payload when creating a new quotation (from modal). */
export interface NewQuotePayload {
    clientId: number
    workId: number
    concreteType: string
    cubicMeters: number
    pricePerM3: number
    /** Fecha de vencimiento de la oferta (YYYY-MM-DD). Obligatoria. */
    validUntil: string
    clientName?: string
    workName?: string
    totalAmount?: number
}

/** Quote as shown in Cotizaciones list (can add id, code, date, status later from API). */
export interface Quote {
    id: number
    code: string
    clientId: number
    workId: number
    clientName: string
    workName: string
    concreteType: string
    cubicMeters: number
    pricePerM3?: number
    totalAmount: number
    currency?: string
    date: string
    status: QuoteStatus
    validUntil?: string | null
    notes?: string | null
}

export interface Order {
    id: number
    code: string
    clientId: number
    workId: number
    quotationId?: number | null
    clientName: string
    workName: string
    concreteType: string
    cubicMeters: number
    totalAmount: number
    deliveryAt: string
    status: OrderStatus
    isScheduled: boolean
    mixerLabel?: string
    driverName?: string
    /** ISO 8601 desde API */
    createdAt?: string
}

export type MixerStatus = 'available' | 'in_use' | 'maintenance'
export type DriverStatus = 'available' | 'on_route'

export interface Mixer {
    id: number
    code: string
    capacityM3: number
    plates: string
    status: MixerStatus
}

export interface Driver {
    id: number
    name: string
    phone: string
    license: string
    status: DriverStatus
}

export type OrderTimelineStatus = 'completed' | 'pending'

export interface OrderTimelineEvent {
    id: number
    orderId: number
    type: 'created' | 'scheduled' | 'dispatched' | 'delivered' | null
    label: string
    status: OrderTimelineStatus
    timestamp: string
    notes?: string | null
}

export interface Invoice {
    id: number
    code: string
    orderId: number
    clientId: number
    clientName: string
    amount: number
    issueDate: string
    dueDate: string
    status: InvoiceStatus
    creditLabel: string
}
