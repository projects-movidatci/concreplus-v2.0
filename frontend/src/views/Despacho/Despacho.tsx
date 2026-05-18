import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
    HiOutlineTruck,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlinePaperAirplane,
    HiOutlineCalendar,
    HiOutlineCube,
} from 'react-icons/hi'
import type { Order, OrderStatus } from '@/data/concreto/types'
import { apiGetOrders, apiUpdateOrder } from '@/services/OrdersService'
import { toastError, toastSuccess } from '@/views/concreto/toast'

type DispatchStatus = Extract<OrderStatus, 'scheduled' | 'dispatched' | 'delivered'>

const statusLabel: Record<DispatchStatus, string> = {
    scheduled: 'Programado',
    dispatched: 'En Camino',
    delivered: 'Entregado',
}

function formatDeliveryAt(iso: string) {
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return iso
        return d.toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short',
        })
    } catch {
        return iso
    }
}

const PIPELINE: OrderStatus[] = ['scheduled', 'dispatched', 'delivered']

const Despacho = () => {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    const loadOrders = useCallback(async () => {
        try {
            const all = await apiGetOrders()
            setOrders(
                all
                    .filter((o) => PIPELINE.includes(o.status))
                    .sort((a, b) => b.id - a.id)
            )
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message || 'Error al cargar pedidos'
            )
        }
    }, [])

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            await loadOrders()
            setIsLoading(false)
        }
        void run()
    }, [loadOrders])

    const tripsToday = useMemo(() => orders, [orders])

    const kpis = useMemo(() => {
        const programmed = tripsToday.filter((o) => o.status === 'scheduled')
            .length
        const onRoute = tripsToday.filter((o) => o.status === 'dispatched')
            .length
        const delivered = tripsToday.filter((o) => o.status === 'delivered')
            .length
        return { programmed, onRoute, delivered }
    }, [tripsToday])

    const handleMarkOnRoute = async (orderId: number) => {
        setUpdatingId(orderId)
        try {
            await apiUpdateOrder(orderId, { status: 'dispatched' })
            toastSuccess('Pedido actualizado', 'El pedido se marcó en camino.')
            await loadOrders()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo actualizar',
                err?.response?.data?.message || 'Error al actualizar el pedido'
            )
        } finally {
            setUpdatingId(null)
        }
    }

    const handleMarkDelivered = async (orderId: number) => {
        setUpdatingId(orderId)
        try {
            await apiUpdateOrder(orderId, { status: 'delivered' })
            toastSuccess('Entrega confirmada', 'El pedido se marcó como entregado.')
            await loadOrders()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo actualizar',
                err?.response?.data?.message || 'Error al actualizar el pedido'
            )
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusBadgeClass = (status: DispatchStatus) => {
        if (status === 'scheduled') {
            return 'bg-sky-50 text-sky-700 border border-sky-200'
        }
        if (status === 'dispatched') {
            return 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }

    const getOrderBorderClass = (status: DispatchStatus) => {
        if (status === 'scheduled') {
            return 'border-2 border-sky-300'
        }
        if (status === 'dispatched') {
            return 'border-2 border-amber-300'
        }
        return 'border border-emerald-300'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Despacho y Entrega
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                        Control de viajes: programado → en camino → entregado
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-sky-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">
                                Programados
                            </p>
                            <p className="mt-2 text-3xl font-black text-gray-900">
                                {kpis.programmed}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                            <HiOutlineClock className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                                En Camino
                            </p>
                            <p className="mt-2 text-3xl font-black text-gray-900">
                                {kpis.onRoute}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <HiOutlinePaperAirplane className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                                Entregados
                            </p>
                            <p className="mt-2 text-3xl font-black text-gray-900">
                                {kpis.delivered}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <HiOutlineCheckCircle className="text-xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <HiOutlineTruck className="text-lg" />
                        </span>
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                            Viajes activos
                        </h2>
                    </div>
                    <span className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                        <HiOutlineCalendar className="text-base" />
                        <span>Pedidos programados y en ruta</span>
                    </span>
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-gray-500">
                        Cargando viajes…
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tripsToday.map((order) => {
                            const status = order.status as DispatchStatus
                            return (
                                <Card
                                    key={order.id}
                                    className={`shadow-sm ${getOrderBorderClass(status)}`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                                                    <HiOutlineTruck className="text-2xl" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-500">
                                                        {`Entrega: ${formatDeliveryAt(order.deliveryAt)}`}
                                                    </p>
                                                    <h3 className="text-xl font-black text-gray-900">
                                                        {order.code}
                                                    </h3>
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                                    status
                                                )}`}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {status === 'scheduled' && (
                                                        <HiOutlineClock className="text-xs" />
                                                    )}
                                                    {status === 'dispatched' && (
                                                        <HiOutlinePaperAirplane className="text-xs" />
                                                    )}
                                                    {status === 'delivered' && (
                                                        <HiOutlineCheckCircle className="text-xs" />
                                                    )}
                                                    <span>
                                                        {statusLabel[status]}
                                                    </span>
                                                </span>
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-gray-50 rounded-md px-4 py-3">
                                                <p className="text-xs text-gray-500 font-medium mb-1">
                                                    Cliente
                                                </p>
                                                <p className="font-semibold text-gray-900">
                                                    {order.clientName}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-md px-4 py-3">
                                                <p className="text-xs text-gray-500 font-medium mb-1">
                                                    Obra
                                                </p>
                                                <p className="font-semibold text-gray-900">
                                                    {order.workName}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-md px-4 py-3">
                                                <p className="text-xs text-gray-500 font-medium mb-1">
                                                    Trompo
                                                </p>
                                                <p className="font-semibold text-gray-900">
                                                    {order.mixerLabel ||
                                                        'Por asignar'}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-md px-4 py-3">
                                                <p className="text-xs text-gray-500 font-medium mb-1">
                                                    Chofer
                                                </p>
                                                <p className="font-semibold text-gray-900">
                                                    {order.driverName ||
                                                        'Por asignar'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-stretch justify-between gap-4 border border-orange-200 bg-orange-50 rounded-lg px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm text-orange-800 font-medium">
                                                <HiOutlineCube className="text-base" />
                                                <span>
                                                    {order.concreteType} —{' '}
                                                    {order.cubicMeters} m³
                                                </span>
                                            </div>
                                            <div className="flex items-center text-sm font-semibold text-orange-800">
                                                {order.totalAmount.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-start">
                                            <div className="flex flex-wrap gap-2">
                                                {status === 'scheduled' && (
                                                    <Button
                                                        variant="solid"
                                                        color="orange-500"
                                                        size="sm"
                                                        disabled={
                                                            updatingId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            void handleMarkOnRoute(
                                                                order.id
                                                            )
                                                        }
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <HiOutlinePaperAirplane className="text-base" />
                                                            <span>
                                                                Marcar en Camino
                                                            </span>
                                                        </span>
                                                    </Button>
                                                )}
                                                {status === 'dispatched' && (
                                                    <Button
                                                        variant="solid"
                                                        color="emerald-500"
                                                        size="sm"
                                                        disabled={
                                                            updatingId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            void handleMarkDelivered(
                                                                order.id
                                                            )
                                                        }
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <HiOutlineCheckCircle className="text-base" />
                                                            <span>
                                                                Marcar Entregado
                                                            </span>
                                                        </span>
                                                    </Button>
                                                )}
                                                {status === 'delivered' && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Entrega completada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}

                        {tripsToday.length === 0 && (
                            <div className="py-10 text-center text-gray-500 text-sm">
                                No hay pedidos en programado, en camino o
                                entregado. Programa uno en Programación.
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default Despacho
