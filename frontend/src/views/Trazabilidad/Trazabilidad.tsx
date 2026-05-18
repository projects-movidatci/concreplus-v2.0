import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import {
    HiOutlineLocationMarker,
    HiOutlineCalendar,
    HiOutlineTruck,
    HiOutlineCube,
    HiOutlineCheckCircle,
} from 'react-icons/hi'
import type { Order, OrderStatus, OrderTimelineEvent } from '@/data/concreto/types'
import { apiGetOrderEvents, apiGetOrders } from '@/services/OrdersService'
import { useSearchParams } from 'react-router-dom'
import { toastError } from '@/views/concreto/toast'

const statusLabel: Record<OrderStatus, string> = {
    pending: 'Pendiente',
    scheduled: 'Programado',
    dispatched: 'Despachado',
    delivered: 'Entregado',
}

const TIMELINE_STEPS: {
    type: 'created' | 'scheduled' | 'dispatched' | 'delivered'
    label: string
}[] = [
    { type: 'created', label: 'Pedido creado' },
    { type: 'scheduled', label: 'Programado' },
    { type: 'dispatched', label: 'Despachado' },
    { type: 'delivered', label: 'Entregado' },
]

function formatTs(iso: string) {
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return iso
        return d.toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
        })
    } catch {
        return iso
    }
}

const Trazabilidad = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const [orders, setOrders] = useState<Order[]>([])
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [events, setEvents] = useState<OrderTimelineEvent[]>([])
    const [isLoadingList, setIsLoadingList] = useState(true)
    const [isLoadingEvents, setIsLoadingEvents] = useState(false)

    const loadOrders = useCallback(async () => {
        try {
            const data = await apiGetOrders()
            setOrders(data.sort((a, b) => b.id - a.id))
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
            setIsLoadingList(true)
            await loadOrders()
            setIsLoadingList(false)
        }
        void run()
    }, [loadOrders])

    const orderIdFromUrl = searchParams.get('orderId')
    const parsedOrderId =
        orderIdFromUrl != null && orderIdFromUrl !== ''
            ? Number(orderIdFromUrl)
            : null
    const initialOrderId =
        parsedOrderId != null &&
        !Number.isNaN(parsedOrderId) &&
        parsedOrderId > 0
            ? parsedOrderId
            : null

    useEffect(() => {
        if (initialOrderId == null) return
        setSelectedOrderId(initialOrderId)
    }, [initialOrderId])

    const selectedOrder = useMemo(
        () =>
            selectedOrderId != null
                ? orders.find((o) => o.id === selectedOrderId) || null
                : null,
        [orders, selectedOrderId]
    )

    useEffect(() => {
        if (selectedOrderId == null) {
            setEvents([])
            return
        }

        const loadEv = async () => {
            setIsLoadingEvents(true)
            try {
                const data = await apiGetOrderEvents(selectedOrderId)
                setEvents(data)
            } catch (error: unknown) {
                const err = error as {
                    response?: { data?: { message?: string } }
                }
                toastError(
                    'No se pudo cargar',
                    err?.response?.data?.message ||
                        'Error al cargar eventos del pedido'
                )
                setEvents([])
            } finally {
                setIsLoadingEvents(false)
            }
        }
        void loadEv()
    }, [selectedOrderId])

    const selectOrder = (id: number) => {
        setSelectedOrderId(id)
        setSearchParams({ orderId: String(id) }, { replace: true })
    }

    const createdLabel = useMemo(() => {
        if (!selectedOrder) return ''
        const ev = events.find((e) => e.type === 'created')
        if (ev?.timestamp) return formatTs(ev.timestamp)
        if (selectedOrder.createdAt) return formatTs(selectedOrder.createdAt)
        return '—'
    }, [selectedOrder, events])

    const getOrderCardBorderClass = (status: OrderStatus) => {
        if (status === 'scheduled') {
            return 'border border-sky-300 bg-sky-50/60'
        }
        if (status === 'dispatched') {
            return 'border border-amber-300 bg-amber-50/60'
        }
        if (status === 'delivered') {
            return 'border border-emerald-300 bg-emerald-50/60'
        }
        return 'border border-gray-200 bg-white'
    }

    const getStatusPillClass = (status: OrderStatus) => {
        if (status === 'scheduled') {
            return 'bg-sky-600 text-white'
        }
        if (status === 'dispatched') {
            return 'bg-amber-500 text-white'
        }
        if (status === 'delivered') {
            return 'bg-emerald-500 text-white'
        }
        return 'bg-gray-300 text-gray-800'
    }

    const locationHint = (status: OrderStatus) => {
        if (status === 'pending') {
            return 'El pedido aún no está programado.'
        }
        if (status === 'scheduled') {
            return 'Listo para salida: pendiente de marcar en camino en Despacho.'
        }
        if (status === 'dispatched') {
            return 'Unidad en ruta hacia la obra.'
        }
        if (status === 'delivered') {
            return 'Entrega registrada.'
        }
        return ''
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Trazabilidad
                </h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">
                    Historial del ciclo de vida del pedido (desde la base de
                    datos)
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">
                        Seleccionar pedido
                    </h2>
                    {isLoadingList ? (
                        <p className="text-sm text-gray-500 py-8 text-center">
                            Cargando…
                        </p>
                    ) : orders.length === 0 ? (
                        <p className="text-sm text-gray-500 py-8 text-center">
                            No hay pedidos. Crea uno en Pedidos.
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                            {orders.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => selectOrder(order.id)}
                                    className={`w-full text-left rounded-2xl px-4 py-3 transition border-2 ${
                                        selectedOrderId === order.id
                                            ? 'border-sky-500 bg-white shadow-sm'
                                            : 'border-transparent bg-white hover:border-sky-200'
                                    }`}
                                >
                                    <div
                                        className={`rounded-xl px-4 py-3 flex flex-col gap-1 ${getOrderCardBorderClass(
                                            order.status
                                        )}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-black text-gray-900">
                                                {order.code}
                                            </p>
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusPillClass(
                                                    order.status
                                                )}`}
                                            >
                                                {statusLabel[order.status]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 font-semibold">
                                            {order.clientName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {order.workName}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {order.cubicMeters} m³ —{' '}
                                            {order.concreteType}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    {!selectedOrder && !isLoadingList && (
                        <Card className="h-full flex items-center justify-center py-16">
                            <div className="text-center space-y-3">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                                    <HiOutlineLocationMarker className="text-2xl" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Selecciona un pedido
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Elige un pedido a la izquierda para ver su
                                    historial de eventos.
                                </p>
                            </div>
                        </Card>
                    )}

                    {selectedOrder && (
                        <>
                            <Card>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                                            <HiOutlineCube className="text-2xl" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Registro: {createdLabel}
                                            </p>
                                            <h2 className="text-xl font-black text-gray-900">
                                                {selectedOrder.code}
                                            </h2>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusPillClass(
                                            selectedOrder.status
                                        )}`}
                                    >
                                        {statusLabel[selectedOrder.status]}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    <div className="bg-gray-50 rounded-md px-4 py-3">
                                        <p className="text-xs text-gray-500 font-medium mb-1">
                                            Cliente
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedOrder.clientName}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md px-4 py-3">
                                        <p className="text-xs text-gray-500 font-medium mb-1">
                                            Obra
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedOrder.workName}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md px-4 py-3">
                                        <p className="text-xs text-gray-500 font-medium mb-1">
                                            Trompo
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedOrder.mixerLabel ||
                                                'No asignado'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md px-4 py-3">
                                        <p className="text-xs text-gray-500 font-medium mb-1">
                                            Chofer
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedOrder.driverName ||
                                                'No asignado'}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Historial del pedido
                                </h3>
                                {isLoadingEvents ? (
                                    <p className="text-sm text-gray-500 py-6">
                                        Cargando eventos…
                                    </p>
                                ) : events.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-4">
                                        Aún no hay eventos registrados para este
                                        pedido en el servidor.
                                    </p>
                                ) : (
                                    <div className="flex">
                                        <div className="relative mr-6">
                                            <div className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-emerald-200" />
                                            <div className="flex flex-col items-center gap-6">
                                                {TIMELINE_STEPS.map((step) => {
                                                    const event = events.find(
                                                        (e) =>
                                                            e.type === step.type
                                                    )
                                                    const isCompleted =
                                                        event?.status ===
                                                        'completed'
                                                    return (
                                                        <div
                                                            key={step.type}
                                                            className="relative z-10 flex items-center justify-center"
                                                        >
                                                            <div
                                                                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-sm ${
                                                                    isCompleted
                                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                        : 'bg-white border-gray-300 text-gray-300'
                                                                }`}
                                                            >
                                                                {step.type ===
                                                                    'created' && (
                                                                    <HiOutlineCheckCircle className="text-xl" />
                                                                )}
                                                                {step.type ===
                                                                    'scheduled' && (
                                                                    <HiOutlineCalendar className="text-xl" />
                                                                )}
                                                                {step.type ===
                                                                    'dispatched' && (
                                                                    <HiOutlineTruck className="text-xl" />
                                                                )}
                                                                {step.type ===
                                                                    'delivered' && (
                                                                    <HiOutlineCheckCircle className="text-xl" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-5 flex-1">
                                            {TIMELINE_STEPS.map((step) => {
                                                const event = events.find(
                                                    (e) =>
                                                        e.type === step.type
                                                )
                                                const isCompleted =
                                                    event?.status ===
                                                    'completed'
                                                return (
                                                    <div
                                                        key={step.type}
                                                        className="flex flex-col"
                                                    >
                                                        <p
                                                            className={`text-sm font-semibold ${
                                                                isCompleted
                                                                    ? 'text-emerald-700'
                                                                    : 'text-gray-700'
                                                            }`}
                                                        >
                                                            {event?.label ||
                                                                step.label}
                                                        </p>
                                                        <p
                                                            className={`text-xs font-medium ${
                                                                isCompleted
                                                                    ? 'text-emerald-600'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {isCompleted &&
                                                            event?.timestamp
                                                                ? formatTs(
                                                                      event.timestamp
                                                                  )
                                                                : isCompleted
                                                                  ? 'Completado'
                                                                  : 'Pendiente'}
                                                        </p>
                                                        {event?.notes && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {event.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card>
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Estado de la entrega
                                </h3>
                                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 min-h-[10rem] flex items-center justify-center px-4 py-6">
                                    <div className="text-center space-y-2 max-w-md">
                                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                            <HiOutlineLocationMarker className="text-2xl" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {locationHint(selectedOrder.status)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Mapa o GPS en tiempo real se puede
                                            enlazar aquí cuando lo tengas.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Trazabilidad
