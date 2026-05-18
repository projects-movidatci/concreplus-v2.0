import ApiService from './ApiService'
import type { Work, WorkStatus } from '@/data/concreto/types'

type ApiWork = {
    id: number | string
    clientId: number | string
    name: string
    address: string | null
    status: WorkStatus
    progress: number
    ordersCount: number
}

const mapWork = (item: ApiWork): Work => ({
    id: Number(item.id),
    clientId: Number(item.clientId),
    name: item.name,
    address: item.address ?? '',
    status: item.status,
    progress: Number(item.progress ?? 0),
    ordersCount: Number(item.ordersCount ?? 0),
})

export async function apiGetWorks(
    clientId: number,
    status: WorkStatus | 'all' = 'active'
) {
    const params = new URLSearchParams({ clientId: String(clientId) })
    if (status !== 'all') {
        params.set('status', status)
    }

    const response = await ApiService.fetchData<{ data: ApiWork[] }>({
        url: `/works?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapWork)
}

export async function apiCreateWork(payload: {
    clientId: number
    name: string
    address?: string
    status?: WorkStatus
    progress?: number
}) {
    const response = await ApiService.fetchData<{ data: ApiWork }>({
        url: '/works',
        method: 'post',
        data: payload,
    })

    return mapWork(response.data.data)
}

export async function apiUpdateWork(
    id: number,
    payload: Partial<{
        name: string
        address: string
        status: WorkStatus
        progress: number
    }>
) {
    const response = await ApiService.fetchData<{ data: ApiWork }>({
        url: `/works/${id}`,
        method: 'patch',
        data: payload,
    })

    return mapWork(response.data.data)
}

export async function apiDeleteWork(id: number) {
    await ApiService.fetchData({
        url: `/works/${id}`,
        method: 'delete',
    })
}

/** Todas las obras del tenant (p. ej. selector de cotización). */
export async function apiGetAllWorksForTenant(
    status: WorkStatus | 'all' = 'active'
) {
    const params = new URLSearchParams()
    if (status !== 'all') {
        params.set('status', status)
    }
    const qs = params.toString()
    const response = await ApiService.fetchData<{ data: ApiWork[] }>({
        url: qs ? `/works?${qs}` : '/works',
        method: 'get',
    })

    return response.data.data.map(mapWork)
}
