import { useEffect, useMemo, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { HiOutlineCube } from 'react-icons/hi'
import { CONCRETE_TYPES } from '@/data/concreto'
import type { Client, Quote, Work } from '@/data/concreto/types'
import type { CreateOrderPayload } from '@/services/OrdersService'
import { apiGetQuotations } from '@/services/QuotationsService'

export interface NuevoPedidoModalProps {
    isOpen: boolean
    onClose: () => void
    onCreateOrder: (payload: CreateOrderPayload) => void | Promise<void>
    clients: Client[]
    works: Work[]
    /** Si viene de Cotizaciones con ?quotationId= */
    initialQuotationId?: number | null
}

function defaultDeliveryLocal(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(8, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const NuevoPedidoModal = ({
    isOpen,
    onClose,
    onCreateOrder,
    clients,
    works,
    initialQuotationId,
}: NuevoPedidoModalProps) => {
    const [mode, setMode] = useState<'quotation' | 'manual'>('quotation')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [approvedQuotes, setApprovedQuotes] = useState<Quote[]>([])
    const [quotationId, setQuotationId] = useState<string>('')
    const [deliveryAt, setDeliveryAt] = useState(defaultDeliveryLocal)
    const [deliveryNotes, setDeliveryNotes] = useState('')

    const [clientId, setClientId] = useState<string>('')
    const [workId, setWorkId] = useState<string>('')
    const [concreteType, setConcreteType] = useState('')
    const [cubicMeters, setCubicMeters] = useState('')
    const [totalAmount, setTotalAmount] = useState('')

    useEffect(() => {
        if (!isOpen) return
        setQuotationId('')
        setDeliveryAt(defaultDeliveryLocal())
        setDeliveryNotes('')
        setCubicMeters('')
        setTotalAmount('')
        setConcreteType('')
        setWorkId('')
        setMode('quotation')
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const load = async () => {
            try {
                const list = await apiGetQuotations('approved')
                setApprovedQuotes(list)
                const preferred =
                    initialQuotationId != null &&
                    list.some((q) => q.id === initialQuotationId)
                if (preferred) {
                    setQuotationId(String(initialQuotationId))
                    setMode('quotation')
                } else if (list.length > 0) {
                    setQuotationId(String(list[0].id))
                } else {
                    setQuotationId('')
                    setMode('manual')
                }
            } catch {
                setApprovedQuotes([])
                setQuotationId('')
                setMode('manual')
            }
        }
        void load()
    }, [isOpen, initialQuotationId])

    const clientsActivos = useMemo(
        () => clients.filter((c) => c.status === 'active'),
        [clients]
    )

    useEffect(() => {
        if (clientId === '') {
            setWorkId('')
            return
        }
        const list = works.filter((w) => w.clientId === Number(clientId))
        setWorkId(list[0]?.id != null ? String(list[0].id) : '')
    }, [clientId, works])

    const worksForClient = works.filter(
        (w) => String(w.clientId) === String(clientId)
    )

    const deliveryAtIso = () => {
        const d = new Date(deliveryAt)
        if (Number.isNaN(d.getTime())) return null
        return d.toISOString()
    }

    const canSubmitQuotation =
        mode === 'quotation' &&
        quotationId !== '' &&
        deliveryAtIso() != null &&
        !isSubmitting

    const canSubmitManual =
        mode === 'manual' &&
        clientId !== '' &&
        workId !== '' &&
        concreteType !== '' &&
        Number(cubicMeters) > 0 &&
        Number(totalAmount) >= 0 &&
        deliveryAtIso() != null &&
        !isSubmitting

    const handleSubmit = async () => {
        const iso = deliveryAtIso()
        if (!iso) return

        setIsSubmitting(true)
        try {
            if (mode === 'quotation') {
                if (!quotationId) return
                await Promise.resolve(
                    onCreateOrder({
                        quotationId: Number(quotationId),
                        deliveryAt: iso,
                        deliveryNotes: deliveryNotes.trim() || undefined,
                    })
                )
            } else {
                await Promise.resolve(
                    onCreateOrder({
                        clientId: Number(clientId),
                        workId: Number(workId),
                        concreteType,
                        cubicMeters: Number(cubicMeters),
                        totalAmount: Number(totalAmount),
                        deliveryAt: iso,
                        deliveryNotes: deliveryNotes.trim() || undefined,
                    })
                )
            }
            onClose()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onRequestClose={onClose}
            width={640}
        >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
                Nuevo pedido
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                Desde una cotización aprobada (recomendado) o registro manual.
            </p>

            <div className="flex gap-2 mb-6">
                <Button
                    size="sm"
                    variant={mode === 'quotation' ? 'solid' : 'default'}
                    color={mode === 'quotation' ? 'orange-500' : undefined}
                    type="button"
                    onClick={() => setMode('quotation')}
                    disabled={approvedQuotes.length === 0}
                >
                    Desde cotización
                </Button>
                <Button
                    size="sm"
                    variant={mode === 'manual' ? 'solid' : 'default'}
                    color={mode === 'manual' ? 'orange-500' : undefined}
                    type="button"
                    onClick={() => setMode('manual')}
                >
                    Manual
                </Button>
            </div>

            <div className="space-y-4">
                {mode === 'quotation' ? (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Cotización aprobada{' '}
                            <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={quotationId}
                            onChange={(e) => setQuotationId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        >
                            <option value="">
                                {approvedQuotes.length === 0
                                    ? 'No hay cotizaciones aprobadas'
                                    : 'Seleccionar…'}
                            </option>
                            {approvedQuotes.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.code} — {q.clientName} / {q.workName} (
                                    {q.totalAmount.toLocaleString('es-MX', {
                                        style: 'currency',
                                        currency: 'MXN',
                                    })}
                                    )
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Cliente <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            >
                                <option value="">Seleccionar…</option>
                                {clientsActivos.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Obra <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={workId}
                                onChange={(e) => setWorkId(e.target.value)}
                                disabled={!clientId}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            >
                                <option value="">Seleccionar…</option>
                                {worksForClient.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Tipo de concreto{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={concreteType}
                                onChange={(e) => setConcreteType(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            >
                                <option value="">Seleccionar…</option>
                                {CONCRETE_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    m³ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={cubicMeters}
                                    onChange={(e) =>
                                        setCubicMeters(e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Importe total{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={totalAmount}
                                    onChange={(e) =>
                                        setTotalAmount(e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha y hora de entrega{' '}
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        value={deliveryAt}
                        onChange={(e) => setDeliveryAt(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Notas de entrega (opcional)
                    </label>
                    <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <Button variant="default" onClick={onClose} type="button">
                    Cancelar
                </Button>
                <Button
                    variant="solid"
                    color="orange-500"
                    type="button"
                    disabled={
                        (!canSubmitQuotation && !canSubmitManual) || isSubmitting
                    }
                    onClick={() => void handleSubmit()}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlineCube className="text-base" />
                        Crear pedido
                    </span>
                </Button>
            </div>
        </Dialog>
    )
}

export default NuevoPedidoModal
