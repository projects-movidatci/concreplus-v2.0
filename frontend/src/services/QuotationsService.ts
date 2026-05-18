import ApiService from './ApiService'
import type { NewQuotePayload, Quote, QuoteStatus } from '@/data/concreto/types'

type ApiQuote = {
    id: number | string
    code: string
    clientId: number | string
    workId: number | string
    clientName: string
    workName: string
    concreteType: string
    cubicMeters: number
    pricePerM3: number
    totalAmount: number
    currency: string
    date: string
    status: QuoteStatus
    validUntil: string | null
    notes: string | null
}

type ListQuotationsResponse = {
    data: ApiQuote[]
    meta: {
        page: number
        limit: number
        total: number
    }
}

const mapQuote = (item: ApiQuote): Quote => ({
    id: Number(item.id),
    code: item.code,
    clientId: Number(item.clientId),
    workId: Number(item.workId),
    clientName: item.clientName ?? '',
    workName: item.workName ?? '',
    concreteType: item.concreteType,
    cubicMeters: Number(item.cubicMeters ?? 0),
    pricePerM3: Number(item.pricePerM3 ?? 0),
    totalAmount: Number(item.totalAmount ?? 0),
    currency: item.currency ?? 'MXN',
    date: item.date,
    status: item.status,
    validUntil: item.validUntil,
    notes: item.notes,
})

export async function apiGetQuotations(status?: QuoteStatus) {
    const params = new URLSearchParams({
        page: '1',
        limit: '200',
    })
    if (status) params.set('status', status)

    const response = await ApiService.fetchData<ListQuotationsResponse>({
        url: `/quotations?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapQuote)
}

export async function apiCreateQuotation(payload: NewQuotePayload) {
    const response = await ApiService.fetchData<{ data: ApiQuote }>({
        url: '/quotations',
        method: 'post',
        data: {
            clientId: payload.clientId,
            workId: payload.workId,
            concreteType: payload.concreteType,
            cubicMeters: payload.cubicMeters,
            pricePerM3: payload.pricePerM3,
            validUntil: payload.validUntil,
        },
    })

    return mapQuote(response.data.data)
}

type UpdateQuotationPayload = {
    status?: QuoteStatus
    validUntil?: string | null
    notes?: string | null
}

export async function apiUpdateQuotation(
    id: number,
    payload: UpdateQuotationPayload
) {
    const response = await ApiService.fetchData<{ data: ApiQuote }>({
        url: `/quotations/${id}`,
        method: 'patch',
        data: payload,
    })

    return mapQuote(response.data.data)
}
