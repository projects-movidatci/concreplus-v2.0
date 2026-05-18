import { useState, useEffect, useMemo } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { HiOutlineDocumentText } from 'react-icons/hi'
import type { Client, Work } from '@/data/concreto/types'
import type { NewQuotePayload } from '@/data/concreto/types'

export interface NuevaCotizacionModalProps {
    isOpen: boolean
    onClose: () => void
    /** Debe resolver cuando la cotización quedó creada en el servidor (el modal cierra solo entonces). */
    onCreateQuote: (payload: NewQuotePayload) => void | Promise<void>
    clients: Client[]
    works: Work[]
    concreteTypes: readonly string[]
    /** When opening from Clientes y Obras with a client selected, pass its id to preselect. */
    initialClientId?: number | null
}

const NuevaCotizacionModal = ({
    isOpen,
    onClose,
    onCreateQuote,
    clients,
    works,
    concreteTypes,
    initialClientId,
}: NuevaCotizacionModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [clientId, setClientId] = useState<string | number>('')
    const [workId, setWorkId] = useState<string | number>('')
    const [concreteType, setConcreteType] = useState('')
    const [cubicMeters, setCubicMeters] = useState('')
    const [pricePerM3, setPricePerM3] = useState('1850')
    const [validUntil, setValidUntil] = useState('')

    const clientsActivos = useMemo(
        () => clients.filter((c) => c.status === 'active'),
        [clients]
    )

    useEffect(() => {
        if (!isOpen) return
        const puedePreseleccionar =
            initialClientId != null &&
            clientsActivos.some((c) => c.id === initialClientId)
        setClientId(puedePreseleccionar ? initialClientId : '')
        setWorkId('')
        setConcreteType('')
        setCubicMeters('')
        setPricePerM3('1850')
        setValidUntil('')
    }, [isOpen, initialClientId, clientsActivos])

    useEffect(() => {
        if (clientId === '') {
            setWorkId('')
            return
        }
        const list = works.filter((w) => w.clientId === Number(clientId))
        setWorkId(list[0]?.id ?? '')
    }, [clientId, works])

    const worksForClient = works.filter((w) => String(w.clientId) === String(clientId))
    const client = clientsActivos.find((c) => c.id === Number(clientId))
    const work = works.find((w) => w.id === Number(workId))
    const total = Number(cubicMeters || 0) * Number(pricePerM3 || 0)

    const todayIso = useMemo(() => {
        const t = new Date()
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    }, [])

    const canSubmit =
        clientId !== '' &&
        workId !== '' &&
        concreteType !== '' &&
        cubicMeters !== '' &&
        Number(cubicMeters) > 0 &&
        validUntil !== '' &&
        validUntil >= todayIso

    const handleSubmit = async () => {
        if (!canSubmit || !client || !work || isSubmitting) return
        setIsSubmitting(true)
        try {
            await Promise.resolve(
                onCreateQuote({
                    clientId: Number(clientId),
                    workId: Number(workId),
                    clientName: client.name,
                    workName: work.name,
                    concreteType,
                    cubicMeters: Number(cubicMeters),
                    pricePerM3: Number(pricePerM3),
                    totalAmount: total,
                    validUntil,
                })
            )
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
            width={840}
        >
            <h3 className="text-xl font-bold text-gray-900 mb-6">
                Nueva Cotización
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={clientId}
                        onChange={(e) => {
                            const v = e.target.value
                            setClientId(v === '' ? '' : Number(v))
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                        <option value="">Seleccionar cliente...</option>
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
                        onChange={(e) =>
                            setWorkId(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        disabled={!clientId}
                    >
                        <option value="">Seleccionar obra...</option>
                        {worksForClient.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Tipo de Concreto <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={concreteType}
                        onChange={(e) => setConcreteType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                        <option value="">Seleccionar tipo...</option>
                        {concreteTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha de vencimiento{' '}
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        min={todayIso}
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Hasta esta fecha aplica el precio y condiciones de la
                        cotización.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Metros Cúbicos <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={cubicMeters}
                            onChange={(e) => setCubicMeters(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Precio por m³ <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={pricePerM3}
                            onChange={(e) => setPricePerM3(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                </div>
                {cubicMeters && pricePerM3 && Number(cubicMeters) > 0 && (
                    <div className="mt-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl px-6 py-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">
                            Total estimado
                        </span>
                        <span className="text-2xl font-black text-orange-600">
                            {total.toLocaleString('es-MX', {
                                style: 'currency',
                                currency: 'MXN',
                            })}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <Button variant="default" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    variant="solid"
                    color="orange-500"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit || isSubmitting}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlineDocumentText className="text-base" />
                        <span>Crear Cotización</span>
                    </span>
                </Button>
            </div>
        </Dialog>
    )
}

export default NuevaCotizacionModal
