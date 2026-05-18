import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import {
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlineTruck,
    HiOutlinePhone,
    HiOutlineCheckCircle,
    HiOutlinePlus,
} from 'react-icons/hi'
import type { Order, Mixer, Driver } from '@/data/concreto/types'
import { apiGetOrders, apiUpdateOrder } from '@/services/OrdersService'
import {
    apiGetMixers,
    apiGetDrivers,
    apiCreateMixer,
    apiCreateDriver,
} from '@/services/LogisticsService'
import {
    toastError,
    toastSuccess,
    toastWarning,
} from '@/views/concreto/toast'

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

const Programacion = () => {
    const [orders, setOrders] = useState<Order[]>([])
    const [mixers, setMixers] = useState<Mixer[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [selectedMixerId, setSelectedMixerId] = useState<number | null>(null)
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
    const [showMixerForm, setShowMixerForm] = useState(false)
    const [showDriverForm, setShowDriverForm] = useState(false)
    const [isCreatingMixer, setIsCreatingMixer] = useState(false)
    const [isCreatingDriver, setIsCreatingDriver] = useState(false)
    const [newMixerCode, setNewMixerCode] = useState('')
    const [newMixerPlates, setNewMixerPlates] = useState('')
    const [newMixerCapacity, setNewMixerCapacity] = useState('8')
    const [newDriverName, setNewDriverName] = useState('')
    const [newDriverPhone, setNewDriverPhone] = useState('')
    const [newDriverLicense, setNewDriverLicense] = useState('')

    const loadData = useCallback(async () => {
        try {
            const [ord, mix, drv] = await Promise.all([
                apiGetOrders('pending'),
                apiGetMixers(),
                apiGetDrivers(),
            ])
            setOrders(ord)
            setMixers(mix)
            setDrivers(drv)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message ||
                    'Error al cargar datos de programación'
            )
        }
    }, [])

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            await loadData()
            setIsLoading(false)
        }
        void run()
    }, [loadData])

    const pendingOrders = useMemo(() => orders, [orders])

    const availableMixers = useMemo(
        () => mixers.filter((m) => m.status === 'available'),
        [mixers]
    )

    const availableDrivers = useMemo(
        () => drivers.filter((d) => d.status === 'available'),
        [drivers]
    )

    const selectedOrder =
        selectedOrderId != null
            ? orders.find((o) => o.id === selectedOrderId) || null
            : null
    const selectedMixer =
        selectedMixerId != null
            ? availableMixers.find((m) => m.id === selectedMixerId) || null
            : null
    const selectedDriver =
        selectedDriverId != null
            ? availableDrivers.find((d) => d.id === selectedDriverId) || null
            : null

    const resetSelection = () => {
        setSelectedOrderId(null)
        setSelectedMixerId(null)
        setSelectedDriverId(null)
    }

    const handleConfirm = async () => {
        if (!selectedOrder || !selectedMixer || !selectedDriver) return
        setIsSaving(true)
        try {
            await apiUpdateOrder(selectedOrder.id, {
                status: 'scheduled',
                mixerId: selectedMixer.id,
                driverId: selectedDriver.id,
                isScheduled: true,
            })
            toastSuccess(
                'Programación confirmada',
                'El pedido quedó programado con chofer y trompo.'
            )
            resetSelection()
            await loadData()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo programar',
                err?.response?.data?.message || 'Error al programar el pedido'
            )
        } finally {
            setIsSaving(false)
        }
    }

    const handleCreateMixer = async () => {
        const code = newMixerCode.trim()
        if (!code) {
            toastWarning('Falta información', 'Ingresa el código del trompo.')
            return
        }
        const capacity = Number(newMixerCapacity)
        if (Number.isNaN(capacity) || capacity < 0) {
            toastWarning(
                'Dato inválido',
                'La capacidad del trompo debe ser un número válido.'
            )
            return
        }
        setIsCreatingMixer(true)
        try {
            const created = await apiCreateMixer({
                code,
                plates: newMixerPlates.trim(),
                capacityM3: capacity,
            })
            setMixers((prev) => [...prev, created])
            setShowMixerForm(false)
            setNewMixerCode('')
            setNewMixerPlates('')
            setNewMixerCapacity('8')
            toastSuccess('Trompo registrado', 'El trompo se agregó al catálogo.')
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo registrar',
                err?.response?.data?.message || 'No se pudo registrar el trompo'
            )
        } finally {
            setIsCreatingMixer(false)
        }
    }

    const handleCreateDriver = async () => {
        const name = newDriverName.trim()
        if (!name) {
            toastWarning('Falta información', 'Ingresa el nombre del chofer.')
            return
        }
        setIsCreatingDriver(true)
        try {
            const created = await apiCreateDriver({
                name,
                phone: newDriverPhone.trim(),
                license: newDriverLicense.trim(),
            })
            setDrivers((prev) => [...prev, created])
            setShowDriverForm(false)
            setNewDriverName('')
            setNewDriverPhone('')
            setNewDriverLicense('')
            toastSuccess('Chofer registrado', 'El chofer se agregó al catálogo.')
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo registrar',
                err?.response?.data?.message || 'No se pudo registrar el chofer'
            )
        } finally {
            setIsCreatingDriver(false)
        }
    }

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Programación Logística
                </h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">
                    Asignación de recursos y programación de entregas
                </p>
            </div>

            {isLoading ? (
                <Card className="py-16 text-center text-gray-500">
                    Cargando pedidos y recursos…
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card
                        header={`Pedidos Pendientes (${pendingOrders.length})`}
                        headerExtra={
                            <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    pendingOrders.length === 0
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                            >
                                {pendingOrders.length === 0
                                    ? 'Todo programado'
                                    : 'Requiere atención'}
                            </span>
                        }
                        bodyClass="space-y-3 max-h-[620px] overflow-y-auto"
                    >
                        {pendingOrders.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <HiOutlineCheckCircle className="mx-auto mb-3 text-4xl text-emerald-400" />
                                <p className="font-semibold">
                                    No hay pedidos pendientes
                                </p>
                                <p className="text-sm mt-1">
                                    Crea pedidos en Pedidos o revisa si ya
                                    están programados.
                                </p>
                            </div>
                        ) : (
                            pendingOrders.map((order) => (
                                <div
                                    key={order.id}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ')
                                            setSelectedOrderId(order.id)
                                    }}
                                    onClick={() =>
                                        setSelectedOrderId(order.id)
                                    }
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                        selectedOrderId === order.id
                                            ? 'border-orange-500 bg-orange-50 shadow-lg'
                                            : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {order.code}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {order.clientName}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            Pendiente
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p className="font-semibold">
                                            {order.cubicMeters} m³ —{' '}
                                            {order.concreteType}
                                        </p>
                                        <p className="flex items-center gap-1 text-xs">
                                            <HiOutlineCalendar className="text-xs" />
                                            {formatDeliveryAt(
                                                order.deliveryAt
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </Card>

                    <Card
                        header="Trompos"
                        headerExtra={
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {availableMixers.length} disponibles
                                </span>
                                <Button
                                    size="xs"
                                    variant="solid"
                                    color="orange-500"
                                    onClick={() => setShowMixerForm(true)}
                                >
                                    <HiOutlinePlus className="text-sm" />
                                </Button>
                            </div>
                        }
                        bodyClass="space-y-3 max-h-[620px] overflow-y-auto"
                    >
                        {mixers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No hay trompos en el catálogo. Añade registros
                                en la base de datos (tabla{' '}
                                <code className="text-xs">mixers</code>).
                            </p>
                        ) : (
                            mixers.map((mixer) => {
                                const isAvailable = mixer.status === 'available'
                                const isSelected = selectedMixerId === mixer.id
                                return (
                                    <div
                                        key={mixer.id}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (
                                                !isAvailable ||
                                                (e.key !== 'Enter' &&
                                                    e.key !== ' ')
                                            )
                                                return
                                            setSelectedMixerId(mixer.id)
                                        }}
                                        onClick={() =>
                                            isAvailable &&
                                            setSelectedMixerId(mixer.id)
                                        }
                                        className={`p-4 border-2 rounded-xl transition-all ${
                                            !isAvailable
                                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                : isSelected
                                                  ? 'border-orange-500 bg-orange-50 shadow-lg cursor-pointer'
                                                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">
                                                    {mixer.code}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Capacidad: {mixer.capacityM3}{' '}
                                                    m³
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Placas: {mixer.plates}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    mixer.status === 'available'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : mixer.status ===
                                                            'in_use'
                                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}
                                            >
                                                {mixer.status === 'available'
                                                    ? 'Disponible'
                                                    : mixer.status === 'in_use'
                                                      ? 'En uso'
                                                      : 'Mantenimiento'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </Card>

                    <Card
                        header="Choferes"
                        headerExtra={
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {availableDrivers.length} disponibles
                                </span>
                                <Button
                                    size="xs"
                                    variant="solid"
                                    color="orange-500"
                                    onClick={() => setShowDriverForm(true)}
                                >
                                    <HiOutlinePlus className="text-sm" />
                                </Button>
                            </div>
                        }
                        bodyClass="space-y-3 max-h-[620px] overflow-y-auto"
                    >
                        {drivers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No hay choferes en el catálogo. Añade registros
                                en la base de datos (tabla{' '}
                                <code className="text-xs">drivers</code>).
                            </p>
                        ) : (
                            drivers.map((driver) => {
                                const isAvailable =
                                    driver.status === 'available'
                                const isSelected =
                                    selectedDriverId === driver.id
                                return (
                                    <div
                                        key={driver.id}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (
                                                !isAvailable ||
                                                (e.key !== 'Enter' &&
                                                    e.key !== ' ')
                                            )
                                                return
                                            setSelectedDriverId(driver.id)
                                        }}
                                        onClick={() =>
                                            isAvailable &&
                                            setSelectedDriverId(driver.id)
                                        }
                                        className={`p-4 border-2 rounded-xl transition-all ${
                                            !isAvailable
                                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                : isSelected
                                                  ? 'border-orange-500 bg-orange-50 shadow-lg cursor-pointer'
                                                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {driver.name}
                                                </p>
                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                    <HiOutlinePhone className="text-xs" />
                                                    {driver.phone}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Lic: {driver.license}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    driver.status ===
                                                    'available'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : driver.status ===
                                                            'on_route'
                                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}
                                            >
                                                {driver.status === 'available'
                                                    ? 'Disponible'
                                                    : driver.status ===
                                                        'on_route'
                                                      ? 'En ruta'
                                                      : 'Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </Card>
                </div>
            )}

            {(selectedOrder || selectedMixer || selectedDriver) && !isLoading && (
                <Card
                    header="Resumen de Programación"
                    className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white"
                    bodyClass="space-y-4"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            className={`p-4 rounded-xl ${
                                selectedOrder
                                    ? 'bg-emerald-50 border-2 border-emerald-200'
                                    : 'bg-gray-100'
                            }`}
                        >
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Pedido
                            </p>
                            {selectedOrder ? (
                                <>
                                    <p className="font-bold text-gray-900">
                                        {selectedOrder.code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {selectedOrder.cubicMeters} m³
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    No seleccionado
                                </p>
                            )}
                        </div>

                        <div
                            className={`p-4 rounded-xl ${
                                selectedMixer
                                    ? 'bg-emerald-50 border-2 border-emerald-200'
                                    : 'bg-gray-100'
                            }`}
                        >
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Trompo
                            </p>
                            {selectedMixer ? (
                                <>
                                    <p className="font-bold text-gray-900">
                                        {selectedMixer.code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Cap: {selectedMixer.capacityM3} m³
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    No seleccionado
                                </p>
                            )}
                        </div>

                        <div
                            className={`p-4 rounded-xl ${
                                selectedDriver
                                    ? 'bg-emerald-50 border-2 border-emerald-200'
                                    : 'bg-gray-100'
                            }`}
                        >
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Chofer
                            </p>
                            {selectedDriver ? (
                                <>
                                    <p className="font-bold text-gray-900">
                                        {selectedDriver.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {selectedDriver.phone}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    No seleccionado
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                            variant="default"
                            onClick={resetSelection}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="solid"
                            color="emerald-500"
                            onClick={() => void handleConfirm()}
                            disabled={
                                !selectedOrder ||
                                !selectedMixer ||
                                !selectedDriver ||
                                isSaving
                            }
                        >
                            <span className="flex items-center gap-2">
                                <HiOutlineCheckCircle className="text-base" />
                                <span>Confirmar Programación</span>
                            </span>
                        </Button>
                    </div>
                </Card>
            )}

            <Dialog
                isOpen={showMixerForm}
                onClose={() => !isCreatingMixer && setShowMixerForm(false)}
                onRequestClose={() =>
                    !isCreatingMixer && setShowMixerForm(false)
                }
            >
                <h5 className="mb-4">Nuevo trompo</h5>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código
                        </label>
                        <input
                            value={newMixerCode}
                            onChange={(e) => setNewMixerCode(e.target.value)}
                            placeholder="Ej. T-009"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacidad (m3)
                        </label>
                        <input
                            value={newMixerCapacity}
                            onChange={(e) => setNewMixerCapacity(e.target.value)}
                            placeholder="Ej. 8"
                            type="number"
                            min="0"
                            step="0.1"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Placas
                        </label>
                        <input
                            value={newMixerPlates}
                            onChange={(e) => setNewMixerPlates(e.target.value)}
                            placeholder="Ej. ABC-123-D"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button
                        variant="default"
                        onClick={() => setShowMixerForm(false)}
                        disabled={isCreatingMixer}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="solid"
                        color="orange-500"
                        onClick={() => void handleCreateMixer()}
                        loading={isCreatingMixer}
                    >
                        Guardar trompo
                    </Button>
                </div>
            </Dialog>

            <Dialog
                isOpen={showDriverForm}
                onClose={() => !isCreatingDriver && setShowDriverForm(false)}
                onRequestClose={() =>
                    !isCreatingDriver && setShowDriverForm(false)
                }
            >
                <h5 className="mb-4">Nuevo chofer</h5>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre completo
                        </label>
                        <input
                            value={newDriverName}
                            onChange={(e) => setNewDriverName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <input
                            value={newDriverPhone}
                            onChange={(e) => setNewDriverPhone(e.target.value)}
                            placeholder="Ej. 55 1234 5678"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Licencia
                        </label>
                        <input
                            value={newDriverLicense}
                            onChange={(e) => setNewDriverLicense(e.target.value)}
                            placeholder="Ej. CHOFER-001"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button
                        variant="default"
                        onClick={() => setShowDriverForm(false)}
                        disabled={isCreatingDriver}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="solid"
                        color="orange-500"
                        onClick={() => void handleCreateDriver()}
                        loading={isCreatingDriver}
                    >
                        Guardar chofer
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}

export default Programacion
