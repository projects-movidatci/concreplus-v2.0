import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import NuevoPedidoModal from '@/components/shared/NuevoPedidoModal/NuevoPedidoModal'
import {
    HiOutlineEye,
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlineTruck,
    HiOutlineCheckCircle,
    HiOutlineCube,
    HiOutlineArrowRight,
    HiOutlineCurrencyDollar,
} from 'react-icons/hi'
import type { Client, Order, OrderStatus, Work } from '@/data/concreto/types'
import { canScheduleOrders } from '@/constants/roles.constant'
import { useAppSelector } from '@/store'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGetClients } from '@/services/ClientsService'
import { apiGetAllWorksForTenant } from '@/services/WorksService'
import {
    apiCreateOrder,
    apiGetOrders,
    type CreateOrderPayload,
} from '@/services/OrdersService'
import { toastError, toastSuccess } from '@/views/concreto/toast'

const statusLabel: Record<OrderStatus, string> = {
    pending: 'Pendiente',
    scheduled: 'Programado',
    dispatched: 'En Ruta',
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

const Pedidos = () => {
    const [filter, setFilter] = useState<'all' | OrderStatus>('all')
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [works, setWorks] = useState<Work[]>([])

    const navigate = useNavigate()
    const userAuthority = useAppSelector((s) => s.auth.user.authority)
    const canSchedule = canScheduleOrders(userAuthority)
    const [searchParams, setSearchParams] = useSearchParams()
    const quotationIdFromUrl = searchParams.get('quotationId')
    const parsedQ =
        quotationIdFromUrl != null && quotationIdFromUrl !== ''
            ? Number(quotationIdFromUrl)
            : null
    const initialQuotationId =
        parsedQ != null && !Number.isNaN(parsedQ) && parsedQ > 0
            ? parsedQ
            : null

    const loadOrders = useCallback(async () => {
        try {
            const data = await apiGetOrders()
            setOrders(data)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message || 'Error al cargar pedidos'
            )
        }
    }, [])

    const loadClientsAndWorks = useCallback(async () => {
        try {
            const [c, w] = await Promise.all([
                apiGetClients(),
                apiGetAllWorksForTenant('active'),
            ])
            setClients(c)
            setWorks(w)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message || 'Error al cargar datos'
            )
        }
    }, [])

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            await Promise.all([loadOrders(), loadClientsAndWorks()])
            setIsLoading(false)
        }
        void run()
    }, [loadClientsAndWorks, loadOrders])

    useEffect(() => {
        if (
            initialQuotationId != null &&
            !Number.isNaN(initialQuotationId) &&
            initialQuotationId > 0
        ) {
            setIsModalOpen(true)
        }
    }, [initialQuotationId])

    const filteredOrders = useMemo(() => {
        const list =
            filter === 'all'
                ? orders
                : orders.filter((o) => o.status === filter)
        return [...list].sort((a, b) => b.id - a.id)
    }, [orders, filter])

    const countByStatus = (status: OrderStatus) =>
        orders.filter((o) => o.status === status).length

    const getStatusBadgeClass = (status: OrderStatus) => {
        if (status === 'pending') {
            return 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        if (status === 'scheduled') {
            return 'bg-sky-50 text-sky-700 border border-sky-200'
        }
        if (status === 'dispatched') {
            return 'bg-purple-50 text-purple-700 border border-purple-200'
        }
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }

    const getOrderCardBorderClass = (status: OrderStatus) => {
        if (status === 'pending') {
            return 'border-2 border-amber-300'
        }
        return 'border border-gray-200'
    }

    const handleCreateOrder = async (payload: CreateOrderPayload) => {
        try {
            const created = await apiCreateOrder(payload)
            await loadOrders()
            setFilter('all')
            toastSuccess(
                'Pedido creado',
                `El pedido ${created.code} se registró correctamente.`
            )
            setSearchParams({}, { replace: true })
        } catch (error: unknown) {
            const err = error as {
                response?: { data?: { message?: string }; status?: number }
            }
            const msg =
                err?.response?.data?.message || 'Error al crear el pedido'
            toastError('No se pudo crear', msg)
            throw error
        }
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSearchParams({}, { replace: true })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Pedidos de Concreto
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                        Gestión y seguimiento de pedidos
                    </p>
                </div>
                <Button
                    variant="solid"
                    color="orange-500"
                    className="shadow-md shrink-0"
                    onClick={() => setIsModalOpen(true)}
                    disabled={isLoading}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlineCube className="text-lg" />
                        <span>Nuevo Pedido</span>
                    </span>
                </Button>
            </div>

            {initialQuotationId != null && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <strong>Convertir cotización:</strong> en el modal confirma
                    fecha y hora de entrega y pulsa <strong>Crear pedido</strong>.
                    El nuevo folio aparecerá arriba en la lista.
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Button
                    variant={filter === 'all' ? 'solid' : 'default'}
                    color={filter === 'all' ? 'orange-500' : undefined}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    Todos ({orders.length})
                </Button>
                <Button
                    variant={filter === 'pending' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                >
                    Pendientes ({countByStatus('pending')})
                </Button>
                <Button
                    variant={filter === 'scheduled' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('scheduled')}
                >
                    Programados ({countByStatus('scheduled')})
                </Button>
                <Button
                    variant={filter === 'dispatched' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('dispatched')}
                >
                    En Ruta ({countByStatus('dispatched')})
                </Button>
                <Button
                    variant={filter === 'delivered' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('delivered')}
                >
                    Entregados ({countByStatus('delivered')})
                </Button>
            </div>

            {isLoading ? (
                <Card className="py-16 text-center text-gray-500">
                    Cargando pedidos…
                </Card>
            ) : filteredOrders.length === 0 ? (
                <Card className="py-16 text-center text-gray-500">
                    No hay pedidos en esta vista. Crea uno desde una cotización
                    aprobada o de forma manual.
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredOrders.map((order) => (
                        <Card
                            key={order.id}
                            className={getOrderCardBorderClass(order.status)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <h3 className="text-xl font-black text-gray-900">
                                            {order.code}
                                        </h3>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                                order.status
                                            )}`}
                                        >
                                            <span className="flex items-center gap-1">
                                                {order.status === 'pending' && (
                                                    <HiOutlineClock className="text-xs" />
                                                )}
                                                {order.status ===
                                                    'scheduled' && (
                                                    <HiOutlineCalendar className="text-xs" />
                                                )}
                                                {order.status ===
                                                    'dispatched' && (
                                                    <HiOutlineTruck className="text-xs" />
                                                )}
                                                {order.status ===
                                                    'delivered' && (
                                                    <HiOutlineCheckCircle className="text-xs" />
                                                )}
                                                <span>
                                                    {
                                                        statusLabel[
                                                            order.status
                                                        ]
                                                    }
                                                </span>
                                            </span>
                                        </span>
                                        {order.status === 'pending' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                Requiere programación
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Cliente
                                            </p>
                                            <p className="font-semibold text-gray-900">
                                                {order.clientName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Obra
                                            </p>
                                            <p className="font-semibold text-gray-900">
                                                {order.workName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Tipo de Concreto
                                            </p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {order.concreteType}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Volumen
                                            </p>
                                            <p className="font-semibold text-gray-900 text-lg">
                                                {order.cubicMeters} m³
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1 font-medium">
                                            <HiOutlineCalendar className="text-xs" />
                                            <span>{`Entrega: ${formatDeliveryAt(order.deliveryAt)}`}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-medium">
                                            <HiOutlineCurrencyDollar className="text-xs" />
                                            <span>
                                                {order.totalAmount.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </span>
                                        </div>
                                        {order.isScheduled &&
                                            order.mixerLabel && (
                                                <div className="flex items-center gap-1 font-medium">
                                                    <HiOutlineTruck className="text-xs" />
                                                    <span>
                                                        {order.mixerLabel}
                                                    </span>
                                                </div>
                                            )}
                                        {order.isScheduled &&
                                            order.driverName && (
                                                <div className="flex items-center gap-1 font-medium">
                                                    <HiOutlineCheckCircle className="text-xs" />
                                                    <span>
                                                        {order.driverName}
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                            navigate(
                                                `/app/trazabilidad?orderId=${order.id}`
                                            )
                                        }
                                    >
                                        <span className="flex items-center gap-1">
                                            <HiOutlineEye className="text-base" />
                                            <span>Ver Detalle</span>
                                        </span>
                                    </Button>
                                    {order.status === 'pending' && canSchedule && (
                                        <Button
                                            variant="solid"
                                            color="orange-500"
                                            size="sm"
                                            onClick={() =>
                                                navigate('/app/programacion')
                                            }
                                        >
                                            <span className="flex items-center gap-1">
                                                <span>Programar</span>
                                                <HiOutlineArrowRight className="text-base" />
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <NuevoPedidoModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onCreateOrder={handleCreateOrder}
                clients={clients}
                works={works}
                initialQuotationId={initialQuotationId}
            />
        </div>
    )
}

export default Pedidos
