import ApiService from './ApiService'

export type DashboardNotification = {
    id: number
    code: string
    severity: 'info' | 'warning' | 'success' | 'error'
    title: string
    message: string
    actionPath?: string | null
    actionLabel?: string | null
    createdAt?: string | null
}

export type DashboardData = {
    todayLabel: string
    ordersToday: number
    tripsInProgress: number
    deliveriesCompleted: number
    toCollectAmount: number
    toCollectInvoices: number
    weeklyCompletedOrdersPct: number
    weeklyDeliveryEfficiencyPct: number
    collectionRatePct: number
    notifications: DashboardNotification[]
}

type DashboardResponse = {
    data: DashboardData
}

export async function apiGetDashboard() {
    const response = await ApiService.fetchData<DashboardResponse>({
        url: '/dashboard',
        method: 'get',
    })
    return response.data.data
}
