import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import {
    HiOutlineCube,
    HiOutlineTruck,
    HiOutlineCheckCircle,
    HiOutlineCurrencyDollar,
    HiOutlineExclamationCircle,
    HiOutlineClock,
} from 'react-icons/hi'
import { apiGetDashboard, type DashboardNotification } from '@/services/DashboardService'
import { toastError } from '@/views/concreto/toast'

const Dashboard = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)
    const [todayLabel, setTodayLabel] = useState('')
    const [ordersToday, setOrdersToday] = useState(0)
    const [tripsInProgress, setTripsInProgress] = useState(0)
    const [deliveriesCompleted, setDeliveriesCompleted] = useState(0)
    const [toCollectAmount, setToCollectAmount] = useState(0)
    const [toCollectInvoices, setToCollectInvoices] = useState(0)
    const [weeklyCompletedOrdersPct, setWeeklyCompletedOrdersPct] = useState(0)
    const [weeklyDeliveryEfficiencyPct, setWeeklyDeliveryEfficiencyPct] =
        useState(0)
    const [collectionRatePct, setCollectionRatePct] = useState(0)
    const [notifications, setNotifications] = useState<DashboardNotification[]>(
        []
    )

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            try {
                const data = await apiGetDashboard()
                setTodayLabel(data.todayLabel)
                setOrdersToday(Number(data.ordersToday ?? 0))
                setTripsInProgress(Number(data.tripsInProgress ?? 0))
                setDeliveriesCompleted(Number(data.deliveriesCompleted ?? 0))
                setToCollectAmount(Number(data.toCollectAmount ?? 0))
                setToCollectInvoices(Number(data.toCollectInvoices ?? 0))
                setWeeklyCompletedOrdersPct(
                    Number(data.weeklyCompletedOrdersPct ?? 0)
                )
                setWeeklyDeliveryEfficiencyPct(
                    Number(data.weeklyDeliveryEfficiencyPct ?? 0)
                )
                setCollectionRatePct(Number(data.collectionRatePct ?? 0))
                setNotifications(data.notifications ?? [])
            } catch (error: unknown) {
                const err = error as { response?: { data?: { message?: string } } }
                toastError(
                    'No se pudo cargar',
                    err?.response?.data?.message ||
                        'No se pudo cargar el dashboard.'
                )
            } finally {
                setIsLoading(false)
            }
        }
        void run()
    }, [])

    const dashboardAlerts = useMemo(() => notifications.slice(0, 6), [notifications])

    const getAlertStyle = (severity?: string) => {
        if (severity === 'error') {
            return {
                box: 'bg-rose-50 border-rose-200',
                icon: 'text-rose-600',
                title: 'text-rose-900',
                text: 'text-rose-700',
                buttonColor: 'rose-500' as const,
            }
        }
        if (severity === 'warning') {
            return {
                box: 'bg-amber-50 border-amber-200',
                icon: 'text-amber-600',
                title: 'text-amber-900',
                text: 'text-amber-700',
                buttonColor: 'gray-700' as const,
            }
        }
        if (severity === 'success') {
            return {
                box: 'bg-emerald-50 border-emerald-200',
                icon: 'text-emerald-600',
                title: 'text-emerald-900',
                text: 'text-emerald-700',
                buttonColor: 'emerald-500' as const,
            }
        }
        return {
            box: 'bg-sky-50 border-sky-200',
            icon: 'text-sky-600',
            title: 'text-sky-900',
            text: 'text-sky-700',
            buttonColor: 'sky-500' as const,
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                        Resumen operativo en tiempo real
                    </p>
                </div>
                <div className="text-right bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Hoy es</p>
                    <p className="text-base md:text-xl font-bold text-gray-900">
                        {isLoading ? '...' : todayLabel}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-orange-500 bg-gradient-to-br from-white to-orange-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Pedidos Hoy
                            </p>
                            <p className="text-4xl font-black text-gray-900">
                                {isLoading ? '...' : ordersToday}
                            </p>
                            <p className="text-xs text-emerald-600 mt-2 font-medium">
                                +12% vs ayer
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <HiOutlineCube className="text-white text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border-l-4 border-sky-500 bg-gradient-to-br from-white to-sky-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Viajes en Curso
                            </p>
                            <p className="text-4xl font-black text-gray-900">
                                {isLoading ? '...' : tripsInProgress}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                En ruta
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                            <HiOutlineTruck className="text-white text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border-l-4 border-emerald-500 bg-gradient-to-br from-white to-emerald-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Entregas Completadas
                            </p>
                            <p className="text-4xl font-black text-gray-900">
                                {isLoading ? '...' : deliveriesCompleted}
                            </p>
                            <p className="text-xs text-emerald-600 mt-2 font-medium">
                                Este mes
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <HiOutlineCheckCircle className="text-white text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-white to-purple-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Por Cobrar
                            </p>
                            <p className="text-4xl font-black text-gray-900">
                                {isLoading
                                    ? '...'
                                    : `$${(toCollectAmount / 1000).toFixed(0)}K`}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                {isLoading ? '...' : toCollectInvoices} facturas
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <HiOutlineCurrencyDollar className="text-white text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="⚠️ Alertas y Notificaciones">
                    <div className="space-y-3">
                        {isLoading ? (
                            <p className="text-sm text-gray-500 py-8 text-center">
                                Cargando alertas...
                            </p>
                        ) : dashboardAlerts.length === 0 ? (
                            <p className="text-sm text-gray-500 py-8 text-center">
                                No hay alertas activas.
                            </p>
                        ) : (
                            dashboardAlerts.map((alert) => {
                                const styles = getAlertStyle(alert.severity)
                                return (
                                    <div
                                        key={alert.id}
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 ${styles.box}`}
                                    >
                                        {alert.severity === 'warning' ? (
                                            <HiOutlineClock
                                                className={`${styles.icon} flex-shrink-0 mt-0.5 text-lg`}
                                            />
                                        ) : (
                                            <HiOutlineExclamationCircle
                                                className={`${styles.icon} flex-shrink-0 mt-0.5 text-lg`}
                                            />
                                        )}
                                        <div className="flex-1">
                                            <p className={`font-bold ${styles.title}`}>
                                                {alert.title}
                                            </p>
                                            <p className={`text-sm mt-1 ${styles.text}`}>
                                                {alert.message}
                                            </p>
                                        </div>
                                        {alert.actionPath && (
                                            <Button
                                                size="sm"
                                                color={styles.buttonColor}
                                                variant="solid"
                                                onClick={() => navigate(alert.actionPath || '/app/dashboard')}
                                            >
                                                {alert.actionLabel || 'Ver'}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Card>

                <Card title="📊 Resumen Semanal">
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Pedidos Completados
                                </span>
                                <span className="text-2xl font-black text-emerald-600">
                                    {isLoading ? '...' : weeklyCompletedOrdersPct}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full"
                                    style={{
                                        width: `${Math.max(
                                            0,
                                            Math.min(100, weeklyCompletedOrdersPct)
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Eficiencia de Entregas
                                </span>
                                <span className="text-2xl font-black text-sky-600">
                                    {isLoading ? '...' : weeklyDeliveryEfficiencyPct}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-sky-500 to-sky-600 h-3 rounded-full"
                                    style={{
                                        width: `${Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                weeklyDeliveryEfficiencyPct
                                            )
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Tasa de Cobranza
                                </span>
                                <span className="text-2xl font-black text-purple-600">
                                    {isLoading ? '...' : collectionRatePct}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                                    style={{
                                        width: `${Math.max(
                                            0,
                                            Math.min(100, collectionRatePct)
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default Dashboard

