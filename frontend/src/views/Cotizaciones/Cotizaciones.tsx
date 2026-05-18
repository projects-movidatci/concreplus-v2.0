import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import NuevaCotizacionModal from '@/components/shared/NuevaCotizacionModal/NuevaCotizacionModal'
import {
    HiOutlineFilter,
    HiOutlinePlus,
    HiOutlineCheckCircle,
    HiOutlinePaperAirplane,
    HiOutlineEye,
    HiOutlineUser,
    HiOutlineOfficeBuilding,
    HiOutlineCube,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'
import { CONCRETE_TYPES } from '@/data/concreto'
import type {
    Client,
    Quote,
    QuoteStatus,
    Work,
} from '@/data/concreto/types'
import type { NewQuotePayload } from '@/data/concreto/types'
import { useNavigate } from 'react-router-dom'
import {
    apiCreateQuotation,
    apiGetQuotations,
    apiUpdateQuotation,
} from '@/services/QuotationsService'
import { apiGetClients } from '@/services/ClientsService'
import { apiGetAllWorksForTenant } from '@/services/WorksService'
import {
    toastError,
    toastInfo,
    toastSuccess,
    toastWarning,
} from '@/views/concreto/toast'

function isoDateLocal(d: Date = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Borrador o enviada con vigencia ya pasada (no aplica a aprobadas). */
function isQuoteExpired(quote: Quote): boolean {
    if (!quote.validUntil) return false
    if (quote.status === 'approved') return false
    return quote.validUntil.slice(0, 10) < isoDateLocal()
}

function formatVencimiento(iso: string) {
    const s = iso.slice(0, 10)
    const [y, m, d] = s.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const Cotizaciones = () => {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [works, setWorks] = useState<Work[]>([])
    const [filter, setFilter] = useState<'all' | QuoteStatus>('all')
    const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [detailQuote, setDetailQuote] = useState<Quote | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const [quotesData, clientsData, worksData] = await Promise.all([
                    apiGetQuotations(),
                    apiGetClients(),
                    apiGetAllWorksForTenant('active'),
                ])
                setQuotes(quotesData)
                setClients(clientsData)
                setWorks(worksData)
            } catch (error: unknown) {
                const err = error as { response?: { data?: { message?: string } } }
                toastError(
                    'No se pudo cargar',
                    err?.response?.data?.message ||
                        'Error al cargar cotizaciones'
                )
            } finally {
                setIsLoading(false)
            }
        }

        void loadData()
    }, [])

    const filteredQuotes = useMemo(() => {
        if (filter === 'all') return quotes
        return quotes.filter((q) => q.status === filter)
    }, [filter, quotes])

    const totalAmount = useMemo(
        () => quotes.reduce((acc, q) => acc + q.totalAmount, 0),
        [quotes]
    )

    const expiredQuotes = useMemo(
        () => quotes.filter(isQuoteExpired),
        [quotes]
    )

    useEffect(() => {
        if (isLoading || expiredQuotes.length === 0) return
        const key = `concreplus_cot_vencidas_${isoDateLocal()}`
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
        toastWarning(
            'Cotizaciones vencidas',
            `Hay ${expiredQuotes.length} cotización(es) con vigencia vencida (borrador o enviada). Revisa la columna Vencimiento.`
        )
    }, [isLoading, expiredQuotes])

    const handleOpenNewQuote = () => {
        setIsNewQuoteOpen(true)
    }

    const handleCreateQuote = async (payload: NewQuotePayload) => {
        try {
            const created = await apiCreateQuotation(payload)
            setQuotes((prev) => [created, ...prev])
            toastSuccess(
                'Cotización creada',
                `La cotización ${created.code} se registró correctamente.`
            )
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo crear',
                err?.response?.data?.message || 'Error al crear cotización'
            )
            throw error
        }
    }

    const patchQuoteStatus = async (id: number, status: QuoteStatus) => {
        setUpdatingId(id)
        try {
            const updated = await apiUpdateQuotation(id, { status })
            setQuotes((prev) =>
                prev.map((q) => (q.id === id ? updated : q))
            )
            toastSuccess(
                'Cotización actualizada',
                `La cotización ${updated.code} cambió a estado ${getStatusLabel(
                    updated.status
                ).toLowerCase()}.`
            )
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo actualizar',
                err?.response?.data?.message || 'Error al actualizar cotización'
            )
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusLabel = (status: QuoteStatus) => {
        if (status === 'draft') return 'Borrador'
        if (status === 'sent') return 'Enviada'
        return 'Aprobada'
    }

    const getStatusClass = (status: QuoteStatus) => {
        if (status === 'draft') {
            return 'bg-gray-100 text-gray-700 border border-gray-200'
        }
        if (status === 'sent') {
            return 'bg-sky-50 text-sky-700 border border-sky-200'
        }
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }

    const formatCurrency = (value: number) =>
        value.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN',
        })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Cotizaciones
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                        Gestión de cotizaciones y presupuestos
                    </p>
                </div>
                <Button
                    variant="solid"
                    color="orange-500"
                    className="shadow-md"
                    onClick={handleOpenNewQuote}
                    disabled={isLoading}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlinePlus className="text-lg" />
                        <span>Nueva Cotización</span>
                    </span>
                </Button>
            </div>

            <div className="flex flex-wrap gap-3">
                <Button
                    variant={filter === 'all' ? 'solid' : 'default'}
                    color={filter === 'all' ? 'orange-500' : undefined}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlineFilter className="text-base" />
                        <span>Todas ({quotes.length})</span>
                    </span>
                </Button>
                <Button
                    variant={filter === 'draft' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('draft')}
                >
                    Borradores (
                    {quotes.filter((q) => q.status === 'draft').length})
                </Button>
                <Button
                    variant={filter === 'sent' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('sent')}
                >
                    Enviadas ({quotes.filter((q) => q.status === 'sent').length})
                </Button>
                <Button
                    variant={filter === 'approved' ? 'solid' : 'default'}
                    size="sm"
                    onClick={() => setFilter('approved')}
                >
                    Aprobadas (
                    {quotes.filter((q) => q.status === 'approved').length})
                </Button>
            </div>

            {!isLoading && expiredQuotes.length > 0 && (
                <div
                    role="alert"
                    className="flex flex-wrap items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                >
                    <HiOutlineExclamationCircle className="text-xl shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Alerta: cotizaciones vencidas</p>
                        <p className="mt-1 text-rose-800/90">
                            Tienes {expiredQuotes.length} cotización(es) en borrador o
                            enviada cuya fecha de vencimiento ya pasó. Actualiza el
                            estado o genera una nueva cotización.
                        </p>
                    </div>
                </div>
            )}

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">
                        Cargando cotizaciones…
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">
                                        Folio
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">
                                        Cliente
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">
                                        Obra
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700">
                                        Tipo
                                    </th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">
                                        m³
                                    </th>
                                    <th className="text-right py-3 px-4 font-bold text-gray-700">
                                        Total
                                    </th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700">
                                        Vencimiento
                                    </th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700">
                                        Estado
                                    </th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotes.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-8 text-center text-gray-500"
                                        >
                                            No hay cotizaciones en esta vista.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuotes.map((quote) => (
                                        <tr
                                            key={quote.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-4 px-4 font-mono font-bold text-gray-900">
                                                {quote.code}
                                            </td>
                                            <td className="py-4 px-4 text-gray-700">
                                                {quote.clientName}
                                            </td>
                                            <td className="py-4 px-4 text-gray-700">
                                                {quote.workName}
                                            </td>
                                            <td className="py-4 px-4 text-gray-600 text-sm">
                                                {quote.concreteType}
                                            </td>
                                            <td className="py-4 px-4 text-right font-semibold">
                                                {quote.cubicMeters}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-gray-900">
                                                {quote.totalAmount.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center text-sm">
                                                {quote.validUntil ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span
                                                            className={
                                                                isQuoteExpired(
                                                                    quote
                                                                )
                                                                    ? 'font-semibold text-rose-700'
                                                                    : 'text-gray-800'
                                                            }
                                                        >
                                                            {formatVencimiento(
                                                                quote.validUntil
                                                            )}
                                                        </span>
                                                        {isQuoteExpired(
                                                            quote
                                                        ) && (
                                                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 border border-rose-200">
                                                                Vencida
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                                                        quote.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        quote.status
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                        title="Ver detalle"
                                                        onClick={() =>
                                                            setDetailQuote(
                                                                quote
                                                            )
                                                        }
                                                    >
                                                        <HiOutlineEye className="text-lg" />
                                                    </button>
                                                    {quote.status ===
                                                        'draft' && (
                                                        <Button
                                                            variant="twoTone"
                                                            size="sm"
                                                            disabled={
                                                                updatingId ===
                                                                quote.id
                                                            }
                                                            onClick={() =>
                                                                void patchQuoteStatus(
                                                                    quote.id,
                                                                    'sent'
                                                                )
                                                            }
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <HiOutlinePaperAirplane className="text-base" />
                                                                Enviar
                                                            </span>
                                                        </Button>
                                                    )}
                                                    {quote.status ===
                                                        'sent' && (
                                                        <Button
                                                            variant="solid"
                                                            color="sky-500"
                                                            size="sm"
                                                            disabled={
                                                                updatingId ===
                                                                quote.id
                                                            }
                                                            onClick={() =>
                                                                void patchQuoteStatus(
                                                                    quote.id,
                                                                    'approved'
                                                                )
                                                            }
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <HiOutlineCheckCircle className="text-base" />
                                                                Aprobar
                                                            </span>
                                                        </Button>
                                                    )}
                                                    {quote.status ===
                                                        'approved' && (
                                                        <Button
                                                            variant="solid"
                                                            color="emerald-500"
                                                            size="sm"
                                                            onClick={() => {
                                                                toastInfo(
                                                                    'Siguiente paso',
                                                                    'Confirma la fecha de entrega en Pedidos para crear el pedido.'
                                                                )
                                                                navigate(
                                                                    `/app/pedidos?quotationId=${quote.id}`
                                                                )
                                                            }}
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <HiOutlineCheckCircle className="text-base" />
                                                                Convertir a
                                                                Pedido
                                                            </span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center border-l-4 border-gray-500">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">
                        Total Cotizaciones
                    </p>
                    <p className="text-4xl font-black text-gray-900">
                        {quotes.length}
                    </p>
                </Card>
                <Card className="text-center border-l-4 border-emerald-500">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">
                        Aprobadas
                    </p>
                    <p className="text-4xl font-black text-emerald-600">
                        {
                            quotes.filter((q) => q.status === 'approved')
                                .length
                        }
                    </p>
                </Card>
                <Card className="text-center border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">
                        Monto Total
                    </p>
                    <p className="text-4xl font-black text-orange-600">
                        {totalAmount.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                        })}
                    </p>
                </Card>
            </div>

            <Dialog
                isOpen={detailQuote != null}
                onClose={() => setDetailQuote(null)}
                onRequestClose={() => setDetailQuote(null)}
                width={640}
            >
                {detailQuote && (
                    <div className="space-y-5">
                        {isQuoteExpired(detailQuote) && (
                            <div
                                role="alert"
                                className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                            >
                                <HiOutlineExclamationCircle className="text-xl shrink-0" />
                                <p>
                                    <strong>Alerta:</strong> la vigencia de esta
                                    cotización ya venció. Considera renovar la oferta o
                                    actualizar el estado.
                                </p>
                            </div>
                        )}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-gray-500">
                                        Detalle de cotizacion
                                    </p>
                                    <h3 className="mt-1 text-2xl font-black text-gray-900">
                                        {detailQuote.code}
                                    </h3>
                                </div>
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                        detailQuote.status
                                    )}`}
                                >
                                    {getStatusLabel(detailQuote.status)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Cliente
                                </p>
                                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <HiOutlineUser className="text-base text-gray-500" />
                                    {detailQuote.clientName}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Obra
                                </p>
                                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <HiOutlineOfficeBuilding className="text-base text-gray-500" />
                                    {detailQuote.workName}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Tipo de concreto
                                </p>
                                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <HiOutlineCube className="text-base text-gray-500" />
                                    {detailQuote.concreteType}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Volumen
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {detailQuote.cubicMeters} m³
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                                    Total
                                </p>
                                <p className="flex items-center gap-2 text-lg font-black text-orange-700">
                                    <HiOutlineCurrencyDollar className="text-xl" />
                                    {formatCurrency(detailQuote.totalAmount)}
                                </p>
                            </div>
                            <div
                                className={`rounded-xl border p-3 ${
                                    isQuoteExpired(detailQuote)
                                        ? 'border-rose-200 bg-rose-50'
                                        : 'border-gray-200 bg-white'
                                }`}
                            >
                                <p
                                    className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                                        isQuoteExpired(detailQuote)
                                            ? 'text-rose-800'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    Vencimiento
                                </p>
                                <p
                                    className={`flex items-center gap-2 text-sm font-semibold ${
                                        isQuoteExpired(detailQuote)
                                            ? 'text-rose-900'
                                            : 'text-gray-900'
                                    }`}
                                >
                                    <HiOutlineCalendar className="text-base text-gray-500" />
                                    {detailQuote.validUntil
                                        ? formatVencimiento(
                                              detailQuote.validUntil
                                          )
                                        : '—'}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-gray-100 pt-4">
                            <Button
                                variant="default"
                                onClick={() => setDetailQuote(null)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <NuevaCotizacionModal
                isOpen={isNewQuoteOpen}
                onClose={() => setIsNewQuoteOpen(false)}
                onCreateQuote={handleCreateQuote}
                clients={clients}
                works={works}
                concreteTypes={CONCRETE_TYPES}
            />
        </div>
    )
}

export default Cotizaciones
