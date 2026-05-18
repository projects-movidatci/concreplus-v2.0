import ApiService from './ApiService'
import type { Driver, Mixer, MixerStatus, DriverStatus } from '@/data/concreto/types'

type ApiMixer = {
    id: number | string
    code: string
    capacityM3: number
    plates: string
    status: MixerStatus
}

type ApiDriver = {
    id: number | string
    name: string
    phone: string
    license: string
    status: DriverStatus
}

const mapMixer = (item: ApiMixer): Mixer => ({
    id: Number(item.id),
    code: item.code,
    capacityM3: Number(item.capacityM3 ?? 0),
    plates: item.plates ?? '',
    status: item.status,
})

const mapDriver = (item: ApiDriver): Driver => ({
    id: Number(item.id),
    name: item.name ?? '',
    phone: item.phone ?? '',
    license: item.license ?? '',
    status: item.status,
})

export async function apiGetMixers(status?: MixerStatus) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const qs = params.toString()
    const response = await ApiService.fetchData<{ data: ApiMixer[] }>({
        url: qs ? `/mixers?${qs}` : '/mixers',
        method: 'get',
    })
    return response.data.data.map(mapMixer)
}

export async function apiGetDrivers(status?: DriverStatus) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const qs = params.toString()
    const response = await ApiService.fetchData<{ data: ApiDriver[] }>({
        url: qs ? `/drivers?${qs}` : '/drivers',
        method: 'get',
    })
    return response.data.data.map(mapDriver)
}

export async function apiCreateMixer(payload: {
    code: string
    capacityM3: number
    plates?: string
}) {
    const response = await ApiService.fetchData<{ data: ApiMixer }>({
        url: '/mixers',
        method: 'post',
        data: payload,
    })
    return mapMixer(response.data.data)
}

export async function apiCreateDriver(payload: {
    name: string
    phone?: string
    license?: string
}) {
    const response = await ApiService.fetchData<{ data: ApiDriver }>({
        url: '/drivers',
        method: 'post',
        data: payload,
    })
    return mapDriver(response.data.data)
}
