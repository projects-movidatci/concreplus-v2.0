import ApiService from './ApiService'
import type { Client, CreditType } from '@/data/concreto/types'

type ApiClient = {
    id: number | string
    name: string
    contactName: string
    phone: string | null
    email: string | null
    creditType: CreditType
    balancePending: number
    worksCount: number
    status: 'active' | 'inactive'
}

type ListClientsResponse = {
    data: ApiClient[]
    meta: {
        page: number
        limit: number
        total: number
    }
}

type UpsertClientPayload = {
    name: string
    contactName: string
    phone?: string
    email?: string
    creditType: CreditType
}

const mapClient = (item: ApiClient): Client => ({
    id: Number(item.id),
    name: item.name,
    contactName: item.contactName ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    creditType: item.creditType,
    balancePending: Number(item.balancePending ?? 0),
    worksCount: Number(item.worksCount ?? 0),
    status: item.status,
})

export async function apiGetClients(search?: string) {
    const params = new URLSearchParams({
        page: '1',
        limit: '200',
    })

    if (search?.trim()) {
        params.set('search', search.trim())
    }

    const response = await ApiService.fetchData<ListClientsResponse>({
        url: `/clients?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapClient)
}

export async function apiCreateClient(payload: UpsertClientPayload) {
    const response = await ApiService.fetchData<{ data: ApiClient }>({
        url: '/clients',
        method: 'post',
        data: payload,
    })

    return mapClient(response.data.data)
}

export async function apiUpdateClient(
    id: number,
    payload: Partial<UpsertClientPayload>
) {
    const response = await ApiService.fetchData<{ data: ApiClient }>({
        url: `/clients/${id}`,
        method: 'patch',
        data: payload,
    })

    return mapClient(response.data.data)
}
