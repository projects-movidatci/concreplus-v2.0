import ApiService from './ApiService'
import type { Invoice, InvoiceStatus, Order } from '@/data/concreto/types'

type ApiInvoice = {
    id: number | string
    code: string
    orderId: number | string
    clientId: number | string
    clientName: string
    amount: number
    currency?: string
    issueDate: string
    dueDate: string
    status: InvoiceStatus
    creditLabel: string
}

type ListInvoicesResponse = {
    data: ApiInvoice[]
    meta: {
        page: number
        limit: number
        total: number
    }
}

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
    status: Order['status']
    isScheduled: boolean
    createdAt?: string
}

type ListBillableOrdersResponse = {
    data: ApiOrder[]
    meta: {
        page: number
        limit: number
        total: number
    }
}

const mapBillableOrder = (item: ApiOrder): Order => ({
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
    createdAt: item.createdAt,
})

const mapInvoice = (item: ApiInvoice): Invoice => ({
    id: Number(item.id),
    code: item.code,
    orderId: Number(item.orderId),
    clientId: Number(item.clientId),
    clientName: item.clientName ?? '',
    amount: Number(item.amount ?? 0),
    issueDate: item.issueDate,
    dueDate: item.dueDate,
    status: item.status,
    creditLabel: item.creditLabel ?? '',
})

export async function apiGetInvoices(status?: InvoiceStatus) {
    const params = new URLSearchParams({
        page: '1',
        limit: '200',
    })
    if (status) params.set('status', status)

    const response = await ApiService.fetchData<ListInvoicesResponse>({
        url: `/invoices?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapInvoice)
}

export async function apiGetBillableOrders() {
    const params = new URLSearchParams({
        page: '1',
        limit: '200',
    })
    const response = await ApiService.fetchData<ListBillableOrdersResponse>({
        url: `/invoices/billable-orders?${params.toString()}`,
        method: 'get',
    })

    return response.data.data.map(mapBillableOrder)
}

export async function apiCreateInvoiceFromOrder(orderId: number) {
    const response = await ApiService.fetchData<{ data: ApiInvoice }>({
        url: '/invoices',
        method: 'post',
        data: { orderId },
    })

    return mapInvoice(response.data.data)
}

export async function apiRegisterInvoicePayment(
    invoiceId: number,
    payload?: { method?: string; reference?: string }
) {
    const response = await ApiService.fetchData<{ data: ApiInvoice }>({
        url: `/invoices/${invoiceId}/payments`,
        method: 'post',
        data: payload ?? {},
    })

    return mapInvoice(response.data.data)
}
