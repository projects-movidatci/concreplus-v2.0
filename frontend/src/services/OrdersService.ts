import ApiService from './ApiService'
import type {
    Order,
    OrderStatus,
    OrderTimelineEvent,
    OrderTimelineStatus,
} from '@/data/concreto/types'

type ApiOrder = {
    id: number | string
    code: string
    clientId: number | string
    workId: number | string
    quotationId: number | string | null
    clientName: string
    workName: string
    concreteType: string
    cubicMeters: number
    totalAmount: number
    deliveryAt: string
    status: OrderStatus
    isScheduled: boolean
    mixerId?: number | string | null
    driverId?: number | string | null
    mixerLabel?: string | null
    driverName?: string | null
    dispatchedAt?: string | null
    deliveredAt?: string | null
    deliveryNotes?: string | null
    createdAt?: string
}

type ListOrdersResponse = {
    data: ApiOrder[]
    meta: {
        page: number
        limit: number
        total: number
    }
}

const mapOrder = (item: ApiOrder): Order => ({
    id: Number(item.id),
    code: item.code,
    clientId: Number(item.clientId),
    workId: Number(item.workId),
    quotationId:
        item.quotationId != null && item.quotationId !== ''
            ? Number(item.quotationId)
            : null,
    clientName: item.clientName ?? '',
    workName: item.workName ?? '',
    concreteType: item.concreteType,
    cubicMeters: Number(item.cubicMeters ?? 0),
    totalAmount: Number(item.totalAmount ?? 0),
    deliveryAt: item.deliveryAt,
    status: item.status,
    isScheduled: Boolean(item.isScheduled),
    mixerLabel: item.mixerLabel ?? undefined,
    driverName: item.driverName ?? undefined,
    createdAt: item.createdAt,
})

export async function apiGetOrders(status?: OrderStatus) {
    const params = new URLSearchParams({
        page: '1',
        limit: '200',
    })
    if (status) params.set('status', status)

    const response = await ApiService.fetchData<ListOrdersResponse>({
        url: `/orders?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapOrder)
}

export type CreateOrderPayload =
    | {
          quotationId: number
          deliveryAt: string
          deliveryNotes?: string
      }
    | {
          clientId: number
          workId: number
          concreteType: string
          cubicMeters: number
          totalAmount: number
          deliveryAt: string
          deliveryNotes?: string
      }

export async function apiCreateOrder(payload: CreateOrderPayload) {
    const response = await ApiService.fetchData<{ data: ApiOrder }>({
        url: '/orders',
        method: 'post',
        data: payload,
    })

    return mapOrder(response.data.data)
}

export async function apiUpdateOrder(
    id: number,
    payload: Partial<{
        status: OrderStatus
        deliveryAt: string
        deliveryNotes: string | null
        mixerId: number | null
        driverId: number | null
        isScheduled: boolean
    }>
) {
    const response = await ApiService.fetchData<{ data: ApiOrder }>({
        url: `/orders/${id}`,
        method: 'patch',
        data: payload,
    })

    return mapOrder(response.data.data)
}

type ApiOrderEvent = {
    id: number | string
    orderId: number | string
    type: 'created' | 'scheduled' | 'dispatched' | 'delivered' | null
    label: string
    status: OrderTimelineStatus
    timestamp: string
    notes?: string | null
}

export async function apiGetOrderEvents(orderId: number) {
    const response = await ApiService.fetchData<{ data: ApiOrderEvent[] }>({
        url: `/orders/${orderId}/events`,
        method: 'get',
    })

    return response.data.data.map(
        (row): OrderTimelineEvent => ({
            id: Number(row.id),
            orderId: Number(row.orderId),
            type: row.type,
            label: row.label,
            status: row.status,
            timestamp: row.timestamp,
            notes: row.notes ?? null,
        })
    )
}
