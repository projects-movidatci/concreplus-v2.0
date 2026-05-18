import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
    HiOutlineDocumentText,
    HiOutlineCash,
    HiOutlineClipboardCheck,
} from 'react-icons/hi'
import type { Order } from '@/data/concreto/types'
import {
    apiCreateInvoiceFromOrder,
    apiGetBillableOrders,
} from '@/services/InvoicesService'
import { toastError, toastSuccess } from '@/views/concreto/toast'

function formatDeliveryLabel(iso: string) {
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

const Facturacion = () => {
    const [readyToInvoice, setReadyToInvoice] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [emittingId, setEmittingId] = useState<number | null>(null)
    const [sessionEmitted, setSessionEmitted] = useState(0)

    const loadBillable = useCallback(async () => {
        try {
            const data = await apiGetBillableOrders()
            setReadyToInvoice(data)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message ||
                    'Error al cargar pedidos listos para facturar'
            )
        }
    }, [])

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            await loadBillable()
            setIsLoading(false)
        }
        void run()
    }, [loadBillable])

    const totalAmountToInvoice = useMemo(
        () =>
            readyToInvoice.reduce((acc, order) => acc + order.totalAmount, 0),
        [readyToInvoice]
    )

    const handleEmitInvoice = async (orderId: number) => {
        setEmittingId(orderId)
        try {
            await apiCreateInvoiceFromOrder(orderId)
            setReadyToInvoice((prev) => prev.filter((o) => o.id !== orderId))
            setSessionEmitted((n) => n + 1)
            toastSuccess(
                'Factura registrada',
                'La factura se guardó correctamente.'
            )
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo emitir',
                err?.response?.data?.message || 'No se pudo emitir la factura'
            )
        } finally {
            setEmittingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Facturación
                </h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">
                    Emisión de facturas desde pedidos entregados; XML / CONTPAQi
                    en una fase posterior
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-purple-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                                Listos para Facturar
                            </p>
                            <p className="mt-2 text-3xl font-black text-purple-700">
                                {isLoading ? '…' : readyToInvoice.length}
                            </p>
                            <p className="text-xs text-purple-500 mt-1">
                                Pedidos entregados sin factura
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <HiOutlineDocumentText className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-orange-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                                Monto a Facturar
                            </p>
                            <p className="mt-2 text-3xl font-black text-orange-600">
                                {isLoading
                                    ? '…'
                                    : totalAmountToInvoice.toLocaleString(
                                          'es-MX',
                                          {
                                              style: 'currency',
                                              currency: 'MXN',
                                          }
                                      )}
                            </p>
                            <p className="text-xs text-orange-500 mt-1">
                                Total acumulado (pendientes)
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                            <HiOutlineCash className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-sky-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">
                                Emitidas esta sesión
                            </p>
                            <p className="mt-2 text-3xl font-black text-sky-700">
                                {sessionEmitted}
                            </p>
                            <p className="text-xs text-sky-500 mt-1">
                                Desde que abriste esta pantalla
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                            <HiOutlineClipboardCheck className="text-xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border border-purple-200 bg-purple-50/60">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
                        <HiOutlineDocumentText className="text-lg" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-purple-900">
                            Integración con CONTPAQi (próximamente)
                        </h2>
                        <p className="text-xs md:text-sm text-purple-800 mt-1">
                            Los XML para CFDI se podrán exportar aquí hacia
                            CONTPAQi. Por ahora la factura queda registrada en el
                            sistema y la cobranza la ves en el módulo Cobranza.
                        </p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                    Pedidos listos para facturar
                </h2>
                <div className="space-y-4">
                    {isLoading && (
                        <p className="text-sm text-gray-500 py-6 text-center">
                            Cargando…
                        </p>
                    )}

                    {!isLoading &&
                        readyToInvoice.map((order) => (
                            <Card
                                key={order.id}
                                className="border border-purple-200 shadow-sm"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-purple-500 flex items-center justify-center text-white">
                                                <HiOutlineDocumentText className="text-2xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900">
                                                    {order.code}
                                                </h3>
                                                <p className="text-xs text-gray-600">
                                                    Cliente: {order.clientName}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                                                Concreto
                                            </p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {order.concreteType}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-md px-4 py-3">
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Volumen
                                            </p>
                                            <p className="font-semibold text-gray-900">
                                                {order.cubicMeters} m³
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-md px-4 py-3">
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                Monto
                                            </p>
                                            <p className="font-semibold text-orange-600">
                                                {order.totalAmount.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500 mt-1">
                                        <p>
                                            Fecha entrega:{' '}
                                            {formatDeliveryLabel(
                                                order.deliveryAt
                                            )}
                                        </p>
                                        <Button
                                            variant="solid"
                                            color="orange-500"
                                            size="sm"
                                            disabled={emittingId === order.id}
                                            onClick={() =>
                                                void handleEmitInvoice(order.id)
                                            }
                                        >
                                            <span className="flex items-center gap-2">
                                                <HiOutlineDocumentText className="text-base" />
                                                <span>
                                                    {emittingId === order.id
                                                        ? 'Emitiendo…'
                                                        : 'Emitir factura'}
                                                </span>
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                    {!isLoading && readyToInvoice.length === 0 && (
                        <p className="text-sm text-gray-500 py-6 text-center">
                            No hay pedidos entregados pendientes de facturar. Los
                            pedidos deben estar en estado entregado y sin factura
                            previa.
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}

export default Facturacion
