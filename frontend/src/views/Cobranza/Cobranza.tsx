import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
    HiOutlineCash,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'
import type { Invoice, InvoiceStatus } from '@/data/concreto/types'
import { apiGetInvoices, apiRegisterInvoicePayment } from '@/services/InvoicesService'
import { toastError, toastSuccess } from '@/views/concreto/toast'

type Filter = 'all' | InvoiceStatus

const statusLabel: Record<InvoiceStatus, string> = {
    pending: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida',
}

const Cobranza = () => {
    const [filter, setFilter] = useState<Filter>('all')
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [payingId, setPayingId] = useState<number | null>(null)

    const loadInvoices = useCallback(async () => {
        try {
            const data = await apiGetInvoices()
            setInvoices(data)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message || 'Error al cargar facturas'
            )
        }
    }, [])

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            await loadInvoices()
            setIsLoading(false)
        }
        void run()
    }, [loadInvoices])

    const filteredInvoices = useMemo(() => {
        if (filter === 'all') return invoices
        return invoices.filter((inv) => inv.status === filter)
    }, [invoices, filter])

    const sumByStatus = (status: InvoiceStatus) =>
        invoices
            .filter((inv) => inv.status === status)
            .reduce((acc, inv) => acc + inv.amount, 0)

    const kpis = useMemo(
        () => ({
            overdueAmount: sumByStatus('overdue'),
            overdueCount: invoices.filter((i) => i.status === 'overdue').length,
            pendingAmount: sumByStatus('pending'),
            pendingCount: invoices.filter((i) => i.status === 'pending').length,
            paidAmount: sumByStatus('paid'),
            paidCount: invoices.filter((i) => i.status === 'paid').length,
        }),
        [invoices]
    )

    const handleRegisterPayment = async (invoiceId: number) => {
        setPayingId(invoiceId)
        try {
            const updated = await apiRegisterInvoicePayment(invoiceId, {
                method: 'cash',
            })
            setInvoices((prev) =>
                prev.map((inv) => (inv.id === invoiceId ? updated : inv))
            )
            toastSuccess('Pago registrado', 'El pago se aplicó a la factura.')
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo registrar',
                err?.response?.data?.message || 'Error al registrar el pago'
            )
        } finally {
            setPayingId(null)
        }
    }

    const getStatusBadgeClass = (status: InvoiceStatus) => {
        if (status === 'pending') {
            return 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        if (status === 'paid') {
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }
        return 'bg-rose-50 text-rose-700 border border-rose-200'
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Cobranza
                </h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">
                    Gestión de pagos y seguimiento de facturas
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-rose-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">
                                Vencidas
                            </p>
                            <p className="mt-2 text-3xl font-black text-rose-600">
                                {kpis.overdueAmount.toLocaleString('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN',
                                })}
                            </p>
                            <p className="text-xs text-rose-500 mt-1">
                                {kpis.overdueCount} facturas
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                            <HiOutlineExclamationCircle className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                                Pendientes
                            </p>
                            <p className="mt-2 text-3xl font-black text-amber-600">
                                {kpis.pendingAmount.toLocaleString('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN',
                                })}
                            </p>
                            <p className="text-xs text-amber-500 mt-1">
                                {kpis.pendingCount} facturas
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <HiOutlineClock className="text-xl" />
                        </div>
                    </div>
                </Card>

                <Card className="border border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                                Cobrados
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-600">
                                {kpis.paidAmount.toLocaleString('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN',
                                })}
                            </p>
                            <p className="text-xs text-emerald-500 mt-1">
                                {kpis.paidCount} facturas
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
                            <HiOutlineCash className="text-lg" />
                        </span>
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                            Facturas
                        </h2>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={filter === 'all' ? 'solid' : 'default'}
                        color={filter === 'all' ? 'orange-500' : undefined}
                        onClick={() => setFilter('all')}
                        disabled={isLoading}
                    >
                        Todas
                    </Button>
                    <Button
                        size="sm"
                        variant={filter === 'overdue' ? 'solid' : 'default'}
                        onClick={() => setFilter('overdue')}
                        disabled={isLoading}
                    >
                        Vencido
                    </Button>
                    <Button
                        size="sm"
                        variant={filter === 'pending' ? 'solid' : 'default'}
                        onClick={() => setFilter('pending')}
                        disabled={isLoading}
                    >
                        Pendiente
                    </Button>
                    <Button
                        size="sm"
                        variant={filter === 'paid' ? 'solid' : 'default'}
                        onClick={() => setFilter('paid')}
                        disabled={isLoading}
                    >
                        Pagado
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-gray-500 py-10 text-center">
                        Cargando facturas…
                    </p>
                ) : filteredInvoices.length === 0 ? (
                    <p className="text-sm text-gray-500 py-10 text-center">
                        No hay facturas en esta vista. Las facturas se generan
                        desde el módulo Facturación (pedidos entregados).
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                    <th className="py-2 pr-4 font-medium">
                                        Folio
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Cliente
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Monto
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Fecha
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Vencimiento
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Estado
                                    </th>
                                    <th className="py-2 pr-4 font-medium text-right">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="border-b border-gray-100 last:border-0"
                                    >
                                        <td className="py-3 pr-4 align-middle">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">
                                                    {inv.code}
                                                </span>
                                                <span className="text-xs text-indigo-500">
                                                    {inv.creditLabel}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4 align-middle">
                                            <span className="text-gray-900 font-medium">
                                                {inv.clientName}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 align-middle">
                                            <span className="font-semibold text-gray-900">
                                                {inv.amount.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 align-middle text-gray-700">
                                            {inv.issueDate}
                                        </td>
                                        <td className="py-3 pr-4 align-middle text-gray-900 font-semibold">
                                            {inv.dueDate}
                                        </td>
                                        <td className="py-3 pr-4 align-middle">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                                    inv.status
                                                )}`}
                                            >
                                                {statusLabel[inv.status]}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-0 align-middle text-right">
                                            {inv.status === 'pending' ||
                                            inv.status === 'overdue' ? (
                                                <Button
                                                    size="sm"
                                                    variant="solid"
                                                    color="emerald-500"
                                                    disabled={
                                                        payingId === inv.id
                                                    }
                                                    onClick={() =>
                                                        void handleRegisterPayment(
                                                            inv.id
                                                        )
                                                    }
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <HiOutlineCash className="text-base" />
                                                        <span>
                                                            Registrar Pago
                                                        </span>
                                                    </span>
                                                </Button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                    <HiOutlineCheckCircle className="text-sm" />
                                                    <span>Pagado</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}

export default Cobranza
