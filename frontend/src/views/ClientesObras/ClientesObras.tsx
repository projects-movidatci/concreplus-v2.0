import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import NuevaCotizacionModal from '@/components/shared/NuevaCotizacionModal/NuevaCotizacionModal'
import {
    HiOutlineSearch,
    HiOutlinePhone,
    HiOutlineOfficeBuilding,
    HiOutlineUserGroup,
    HiOutlineLocationMarker,
    HiOutlineUserAdd,
    HiOutlineDocumentText,
    HiOutlinePencilAlt,
    HiOutlineTrash,
} from 'react-icons/hi'
import { CONCRETE_TYPES } from '@/data/concreto'
import type { Client, Work, CreditType, WorkStatus } from '@/data/concreto/types'
import type { NewQuotePayload } from '@/data/concreto/types'
import { apiCreateClient, apiGetClients, apiUpdateClient } from '@/services/ClientsService'
import {
    apiCreateWork,
    apiDeleteWork,
    apiGetAllWorksForTenant,
    apiGetWorks,
    apiUpdateWork,
} from '@/services/WorksService'
import { apiCreateQuotation } from '@/services/QuotationsService'
import {
    toastError,
    toastSuccess,
    toastWarning,
} from '@/views/concreto/toast'

const creditLabel: Record<CreditType, string> = {
    cash: 'contado',
    '15_days': '15 días',
}

type WorkDraftLine = {
    key: string
    name: string
    address: string
    status: WorkStatus
    /** null = campo vacío en el formulario; al guardar se envía 0 */
    progress: number | null
}

type EditWorkLine = WorkDraftLine & {
    serverId?: number
    deleted?: boolean
}

const newDraftKey = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random())

const ClientesObras = () => {
    const [search, setSearch] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [worksAll, setWorksAll] = useState<Work[]>([])
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
    const [isLoadingClients, setIsLoadingClients] = useState(false)

    const [isNewClientOpen, setIsNewClientOpen] = useState(false)
    const [newWizardStep, setNewWizardStep] = useState<1 | 2>(1)
    const [newClientCreatedId, setNewClientCreatedId] = useState<number | null>(
        null
    )
    const [newWorksDraft, setNewWorksDraft] = useState<WorkDraftLine[]>([])

    const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false)
    const [isEditClientOpen, setIsEditClientOpen] = useState(false)
    const [editWizardStep, setEditWizardStep] = useState<1 | 2>(1)
    const [editWorkLines, setEditWorkLines] = useState<EditWorkLine[]>([])
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    const [newClientForm, setNewClientForm] = useState({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        creditType: 'cash' as CreditType,
    })

    const [editClientForm, setEditClientForm] = useState(newClientForm)

    const activeClientsCount = useMemo(
        () => clients.filter((c) => c.status === 'active').length,
        [clients]
    )

    const selectedClient = useMemo(
        () =>
            selectedClientId != null
                ? clients.find((c) => c.id === selectedClientId) || null
                : null,
        [clients, selectedClientId]
    )

    const clientWorks = useMemo(
        () =>
            selectedClient
                ? worksAll.filter(
                      (w) =>
                          w.clientId === selectedClient.id && w.status === 'active'
                  )
                : [],
        [selectedClient, worksAll]
    )

    const handleSelectClient = (clientId: number) => {
        setSelectedClientId(clientId)
    }

    const resetNewClientForm = () => {
        setNewClientForm({
            name: '',
            contactName: '',
            phone: '',
            email: '',
            creditType: 'cash',
        })
    }

    const refreshAllWorks = useCallback(async () => {
        try {
            const list = await apiGetAllWorksForTenant('active')
            setWorksAll(list)
        } catch (error: any) {
            toastError(
                'No se pudo cargar',
                error?.response?.data?.message || 'Error al cargar obras'
            )
        }
    }, [])

    const loadClients = async (term?: string) => {
        setIsLoadingClients(true)
        try {
            const data = await apiGetClients(term)
            setClients(data)
            await refreshAllWorks()
            if (data.length === 0) {
                setSelectedClientId(null)
                return
            }
            const currentExists = selectedClientId
                ? data.some((client) => client.id === selectedClientId)
                : false
            if (!currentExists) {
                setSelectedClientId(data[0].id)
            }
        } catch (error: any) {
            toastError(
                'No se pudo cargar',
                error?.response?.data?.message || 'Error al cargar clientes'
            )
        } finally {
            setIsLoadingClients(false)
        }
    }

    useEffect(() => {
        void loadClients(search)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const closeNewClientModal = () => {
        setIsNewClientOpen(false)
        setNewWizardStep(1)
        setNewClientCreatedId(null)
        setNewWorksDraft([])
        resetNewClientForm()
    }

    const handleOpenNewClient = () => {
        resetNewClientForm()
        setNewWizardStep(1)
        setNewClientCreatedId(null)
        setNewWorksDraft([])
        setIsNewClientOpen(true)
    }

    const handleNewClientStep1Next = async () => {
        if (!newClientForm.name || !newClientForm.contactName) {
            toastWarning(
                'Faltan datos',
                'Completa los campos obligatorios del cliente.'
            )
            return
        }

        try {
            const created = await apiCreateClient({
                name: newClientForm.name,
                contactName: newClientForm.contactName,
                phone: newClientForm.phone,
                email: newClientForm.email,
                creditType: newClientForm.creditType,
            })
            setClients((prev) => [created, ...prev])
            setNewClientCreatedId(created.id)
            setNewWizardStep(2)
            setNewWorksDraft([
                {
                    key: newDraftKey(),
                    name: '',
                    address: '',
                    status: 'active',
                    progress: null,
                },
            ])
            toastSuccess(
                'Cliente registrado',
                'Ahora agrega las obras para completar el alta.'
            )
        } catch (error: any) {
            toastError(
                'No se pudo crear',
                error?.response?.data?.message || 'Error al crear cliente'
            )
        }
    }

    const handleNewClientStep2Finish = async () => {
        if (newClientCreatedId == null) {
            toastError('Dato inválido', 'Cliente no identificado.')
            return
        }

        const toCreate = newWorksDraft.filter((d) => d.name.trim() !== '')
        if (toCreate.length === 0) {
            await handleNewClientStep2Skip()
            return
        }

        try {
            for (const line of toCreate) {
                await apiCreateWork({
                    clientId: newClientCreatedId,
                    name: line.name.trim(),
                    address: line.address.trim() || undefined,
                    status: line.status,
                    progress: line.progress ?? 0,
                })
            }
            await refreshAllWorks()
            await loadClients(search)
            setSelectedClientId(newClientCreatedId)
            toastSuccess(
                'Obras registradas',
                'Las obras se guardaron correctamente.'
            )
            closeNewClientModal()
        } catch (error: any) {
            toastError(
                'No se pudo crear',
                error?.response?.data?.message || 'Error al crear obras'
            )
        }
    }

    const handleNewClientStep2Skip = async () => {
        if (newClientCreatedId != null) {
            setSelectedClientId(newClientCreatedId)
        }
        await loadClients(search)
        await refreshAllWorks()
        toastSuccess(
            'Cliente guardado',
            'Puedes agregar obras más adelante desde Editar cliente.'
        )
        closeNewClientModal()
    }

    const closeEditClientModal = () => {
        setIsEditClientOpen(false)
        setEditWizardStep(1)
        setEditWorkLines([])
    }

    const handleOpenEditClient = () => {
        if (!selectedClient) return
        setEditClientForm({
            name: selectedClient.name,
            contactName: selectedClient.contactName,
            phone: selectedClient.phone,
            email: selectedClient.email,
            creditType: selectedClient.creditType,
        })
        setEditWizardStep(1)
        setEditWorkLines([])
        setIsEditClientOpen(true)
    }

    const handleEditStep1Next = async () => {
        if (!selectedClient) return
        if (!editClientForm.name || !editClientForm.contactName) {
            toastWarning(
                'Faltan datos',
                'Completa los campos obligatorios del cliente.'
            )
            return
        }

        try {
            const list = await apiGetWorks(selectedClient.id, 'all')
            setEditWorkLines(
                list.map((w) => ({
                    key: newDraftKey(),
                    serverId: w.id,
                    name: w.name,
                    address: w.address,
                    status: w.status,
                    progress: w.progress,
                }))
            )
            if (list.length === 0) {
                setEditWorkLines([
                    {
                        key: newDraftKey(),
                        name: '',
                        address: '',
                        status: 'active',
                        progress: null,
                    },
                ])
            }
            setEditWizardStep(2)
        } catch (error: any) {
            toastError(
                'No se pudo cargar',
                error?.response?.data?.message || 'Error al cargar obras'
            )
        }
    }

    const handleSaveEditWizard = async () => {
        if (!selectedClient) return
        if (!editClientForm.name || !editClientForm.contactName) {
            toastWarning(
                'Faltan datos',
                'Completa los campos obligatorios del cliente.'
            )
            return
        }

        setIsSavingEdit(true)
        try {
            await apiUpdateClient(selectedClient.id, {
                name: editClientForm.name,
                contactName: editClientForm.contactName,
                phone: editClientForm.phone,
                email: editClientForm.email,
                creditType: editClientForm.creditType,
            })

            for (const line of editWorkLines) {
                if (line.deleted && line.serverId) {
                    await apiDeleteWork(line.serverId)
                    continue
                }
                if (line.deleted) continue

                if (line.serverId) {
                    await apiUpdateWork(line.serverId, {
                        name: line.name.trim(),
                        address: line.address,
                        status: line.status,
                        progress: line.progress ?? 0,
                    })
                } else if (line.name.trim()) {
                    await apiCreateWork({
                        clientId: selectedClient.id,
                        name: line.name.trim(),
                        address: line.address.trim() || undefined,
                        status: line.status,
                        progress: line.progress ?? 0,
                    })
                }
            }

            const data = await apiGetClients(search)
            setClients(data)
            await refreshAllWorks()
            toastSuccess(
                'Cambios guardados',
                'Cliente y obras actualizados correctamente.'
            )
            closeEditClientModal()
        } catch (error: any) {
            toastError(
                'No se pudo guardar',
                error?.response?.data?.message || 'Error al guardar cambios'
            )
        } finally {
            setIsSavingEdit(false)
        }
    }

    const handleOpenNewQuote = () => {
        if (!selectedClient || selectedClient.status === 'inactive') return
        setIsNewQuoteOpen(true)
    }

    const handleCreateQuoteFromModal = async (payload: NewQuotePayload) => {
        try {
            await apiCreateQuotation(payload)
            toastSuccess('Cotización creada', 'La cotización se registró.')
        } catch (error: any) {
            toastError(
                'No se pudo crear',
                error?.response?.data?.message || 'Error al crear cotización'
            )
            throw error
        }
    }

    const renderWorkDraftRow = (
        line: WorkDraftLine,
        onChange: (next: WorkDraftLine) => void,
        onRemove: () => void
    ) => (
        <div
            key={line.key}
            className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
        >
            <div className="flex justify-between items-center gap-2 border-b border-gray-200 pb-2">
                <span className="text-sm font-semibold text-gray-800">
                    Datos de la obra
                </span>
                <button
                    type="button"
                    className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                    onClick={onRemove}
                    aria-label="Quitar obra"
                >
                    <HiOutlineTrash className="text-lg" />
                </button>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nombre de la obra <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={line.name}
                    onChange={(e) => onChange({ ...line, name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-200 text-sm"
                    placeholder="Ej. Torre residencial Centro"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Dirección
                </label>
                <input
                    type="text"
                    value={line.address}
                    onChange={(e) =>
                        onChange({ ...line, address: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border border-gray-200 text-sm"
                    placeholder="Calle, número, colonia (opcional)"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Estado de la obra
                    </label>
                    <select
                        value={line.status}
                        onChange={(e) =>
                            onChange({
                                ...line,
                                status: e.target.value as WorkStatus,
                            })
                        }
                        className="w-full px-3 py-2 rounded border border-gray-200 text-sm bg-white"
                    >
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                    </select>
                </div>
                <div>
                    <label
                        htmlFor={`work-progress-${line.key}`}
                        className="block text-xs font-semibold text-gray-600 mb-1"
                    >
                        Avance del proyecto (%)
                    </label>
                    <input
                        id={`work-progress-${line.key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={line.progress === null ? '' : line.progress}
                        onChange={(e) => {
                            const v = e.target.value
                            if (v === '') {
                                onChange({ ...line, progress: null })
                                return
                            }
                            const n = Number(v)
                            if (Number.isNaN(n)) return
                            if (n > 100) {
                                onChange({ ...line, progress: 100 })
                                return
                            }
                            if (n < 0) {
                                onChange({ ...line, progress: 0 })
                                return
                            }
                            onChange({ ...line, progress: n })
                        }}
                        onBlur={() => {
                            if (
                                line.progress !== null &&
                                line.progress > 100
                            ) {
                                onChange({ ...line, progress: 100 })
                            }
                            if (
                                line.progress !== null &&
                                line.progress < 0
                            ) {
                                onChange({ ...line, progress: 0 })
                            }
                        }}
                        className="w-full px-3 py-2 rounded border border-gray-200 text-sm"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Clientes y Obras
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                        Gestión de clientes y proyectos activos
                    </p>
                </div>
                <Button
                    variant="solid"
                    color="orange-500"
                    className="shadow-md"
                    onClick={handleOpenNewClient}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlineUserAdd className="text-lg" />
                        <span>Nuevo Cliente</span>
                    </span>
                </Button>
            </div>

            <Card bordered={false} bodyClass="p-0">
                <div className="relative">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar cliente por nombre o contacto..."
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm md:text-base"
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    header={
                        <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-gray-800">
                                Clientes ({clients.length})
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {activeClientsCount} activos
                            </span>
                        </div>
                    }
                    bodyClass="space-y-3 max-h-[500px] overflow-y-auto"
                >
                    {isLoadingClients ? (
                        <div className="text-sm text-gray-500 p-2">
                            Cargando clientes...
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-sm text-gray-500 p-2">
                            No hay clientes disponibles.
                        </div>
                    ) : (
                        clients.map((client) => {
                            const isSelected = client.id === selectedClientId
                            const hasBalance = client.balancePending > 0
                            const isInactive = client.status === 'inactive'

                            return (
                                <div
                                    key={client.id}
                                    className={`border rounded-xl p-4 transition-all cursor-pointer ${
                                        isInactive ? 'opacity-80' : ''
                                    } ${
                                        isSelected
                                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleSelectClient(client.id)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {client.name}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {client.contactName}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {isInactive && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                    Inactivo
                                                </span>
                                            )}
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                    client.creditType ===
                                                    'cash'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                {creditLabel[client.creditType]}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                                        <div className="flex items-center gap-1">
                                            <HiOutlinePhone className="text-gray-400" />
                                            <span>{client.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <HiOutlineOfficeBuilding className="text-gray-400" />
                                            <span>
                                                {client.worksCount}{' '}
                                                {client.worksCount === 1
                                                    ? 'obra'
                                                    : 'obras'}
                                            </span>
                                        </div>
                                    </div>

                                    {hasBalance && (
                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                            <span className="text-xs font-semibold text-red-600">
                                                Saldo pendiente:{' '}
                                                {client.balancePending.toLocaleString(
                                                    'es-MX',
                                                    {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                    }
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </Card>

                <div className="space-y-4">
                    {selectedClient ? (
                        <>
                            <Card
                                header="Información del Cliente"
                                headerExtra={
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="solid"
                                            color="orange-500"
                                            disabled={
                                                selectedClient.status ===
                                                'inactive'
                                            }
                                            title={
                                                selectedClient.status ===
                                                'inactive'
                                                    ? 'No se pueden crear cotizaciones para clientes inactivos'
                                                    : undefined
                                            }
                                            onClick={handleOpenNewQuote}
                                        >
                                            <span className="flex items-center gap-2">
                                                <HiOutlineDocumentText className="text-base" />
                                                <span>Nueva Cotización</span>
                                            </span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={handleOpenEditClient}
                                        >
                                            <HiOutlinePencilAlt className="text-lg" />
                                        </Button>
                                    </div>
                                }
                                bodyClass="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">
                                            Contacto
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedClient.contactName}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">
                                            Teléfono
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedClient.phone}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Email</p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedClient.email}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">
                                            Condiciones
                                        </p>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                selectedClient.creditType ===
                                                'cash'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}
                                        >
                                            {creditLabel[
                                                selectedClient.creditType
                                            ]}
                                        </span>
                                    </div>
                                </div>
                            </Card>

                            <Card
                                header={`Obras activas (${clientWorks.length})`}
                                bodyClass="space-y-3 max-h-[280px] overflow-y-auto"
                            >
                                {clientWorks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-gray-400 py-10 text-sm">
                                        <HiOutlineUserGroup className="text-3xl mb-2" />
                                        <p>No hay obras registradas.</p>
                                    </div>
                                ) : (
                                    clientWorks.map((work) => (
                                        <div
                                            key={work.id}
                                            className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">
                                                        {work.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <HiOutlineLocationMarker className="text-gray-400" />
                                                        <span>
                                                            {work.address ||
                                                                '—'}
                                                        </span>
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {work.status === 'active'
                                                        ? 'Activa'
                                                        : 'Inactiva'}
                                                </span>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                    <span>
                                                        Avance del proyecto
                                                    </span>
                                                    <span className="font-semibold text-gray-800">
                                                        {work.progress}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                                                    <div
                                                        className="h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                                                        style={{
                                                            width: `${work.progress}%`,
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-2">
                                                    {work.ordersCount} pedidos
                                                    realizados
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </Card>
                        </>
                    ) : (
                        <Card bodyClass="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                            <HiOutlineUserGroup className="text-4xl text-gray-300" />
                            <div>
                                <p className="font-semibold text-gray-700">
                                    Selecciona un cliente
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Haz clic en un cliente para ver sus
                                    detalles y obras.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog
                isOpen={isNewClientOpen}
                onClose={closeNewClientModal}
                onRequestClose={closeNewClientModal}
                width={720}
            >
                <div className="flex items-center gap-2 mb-4">
                    <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                            newWizardStep === 1
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        1. Cliente
                    </span>
                    <span className="text-gray-300">→</span>
                    <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                            newWizardStep === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        2. Obras
                    </span>
                </div>

                {newWizardStep === 1 ? (
                    <>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            Nuevo Cliente
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Nombre del Cliente{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newClientForm.name}
                                    onChange={(e) =>
                                        setNewClientForm((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Ej. Constructora Azteca S.A."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Contacto{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newClientForm.contactName}
                                    onChange={(e) =>
                                        setNewClientForm((prev) => ({
                                            ...prev,
                                            contactName: e.target.value,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Nombre de la persona de contacto"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={newClientForm.phone}
                                        onChange={(e) =>
                                            setNewClientForm((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Ej. 555-0101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newClientForm.email}
                                        onChange={(e) =>
                                            setNewClientForm((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="correo@cliente.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Condiciones de crédito
                                </label>
                                <select
                                    value={newClientForm.creditType}
                                    onChange={(e) =>
                                        setNewClientForm((prev) => ({
                                            ...prev,
                                            creditType: e.target.value as CreditType,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                >
                                    <option value="cash">Contado</option>
                                    <option value="15_days">15 días</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="default" onClick={closeNewClientModal}>
                                Cancelar
                            </Button>
                            <Button
                                variant="solid"
                                color="orange-500"
                                onClick={handleNewClientStep1Next}
                                disabled={
                                    !newClientForm.name ||
                                    !newClientForm.contactName
                                }
                            >
                                Siguiente
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Obras del cliente
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Registra una o más obras. Puedes omitir este paso y
                            agregarlas después al editar el cliente.
                        </p>
                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {newWorksDraft.map((line, idx) =>
                                renderWorkDraftRow(
                                    line,
                                    (next) => {
                                        setNewWorksDraft((prev) =>
                                            prev.map((p, i) =>
                                                i === idx ? next : p
                                            )
                                        )
                                    },
                                    () => {
                                        setNewWorksDraft((prev) =>
                                            prev.filter((_, i) => i !== idx)
                                        )
                                    }
                                )
                            )}
                        </div>
                        <Button
                            className="mt-3"
                            variant="default"
                            size="sm"
                            onClick={() =>
                                setNewWorksDraft((prev) => [
                                    ...prev,
                                    {
                                        key: newDraftKey(),
                                        name: '',
                                        address: '',
                                        status: 'active',
                                        progress: null,
                                    },
                                ])
                            }
                        >
                            + Añadir obra
                        </Button>
                        <div className="flex flex-wrap justify-between gap-3 mt-8">
                            <Button
                                variant="default"
                                onClick={() => setNewWizardStep(1)}
                            >
                                Atrás
                            </Button>
                            <div className="flex gap-2 flex-wrap justify-end">
                                <Button variant="default" onClick={handleNewClientStep2Skip}>
                                    Omitir obras
                                </Button>
                                <Button
                                    variant="solid"
                                    color="orange-500"
                                    onClick={handleNewClientStep2Finish}
                                >
                                    Guardar obras
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Dialog>

            <Dialog
                isOpen={isEditClientOpen}
                onClose={closeEditClientModal}
                onRequestClose={closeEditClientModal}
                width={720}
            >
                <div className="flex items-center gap-2 mb-4">
                    <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                            editWizardStep === 1
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        1. Cliente
                    </span>
                    <span className="text-gray-300">→</span>
                    <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                            editWizardStep === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        2. Obras
                    </span>
                </div>

                {editWizardStep === 1 ? (
                    <>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            Editar Cliente
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Nombre del Cliente{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editClientForm.name}
                                    onChange={(e) =>
                                        setEditClientForm((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Contacto{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editClientForm.contactName}
                                    onChange={(e) =>
                                        setEditClientForm((prev) => ({
                                            ...prev,
                                            contactName: e.target.value,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={editClientForm.phone}
                                        onChange={(e) =>
                                            setEditClientForm((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editClientForm.email}
                                        onChange={(e) =>
                                            setEditClientForm((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Condiciones de crédito
                                </label>
                                <select
                                    value={editClientForm.creditType}
                                    onChange={(e) =>
                                        setEditClientForm((prev) => ({
                                            ...prev,
                                            creditType: e.target.value as CreditType,
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                >
                                    <option value="cash">Contado</option>
                                    <option value="15_days">15 días</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button
                                variant="default"
                                onClick={closeEditClientModal}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="solid"
                                color="orange-500"
                                onClick={handleEditStep1Next}
                                disabled={
                                    !editClientForm.name ||
                                    !editClientForm.contactName
                                }
                            >
                                Siguiente
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Obras del cliente
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Edita obras existentes, agrega nuevas o elimínalas
                            (se desactivan en el sistema).
                        </p>
                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {editWorkLines
                                .filter((l) => !l.deleted)
                                .map((line) =>
                                    renderWorkDraftRow(
                                        line,
                                        (next) => {
                                            setEditWorkLines((prev) =>
                                                prev.map((p) =>
                                                    p.key === line.key
                                                        ? {
                                                              ...next,
                                                              serverId:
                                                                  p.serverId,
                                                              deleted:
                                                                  p.deleted,
                                                          }
                                                        : p
                                                )
                                            )
                                        },
                                        () => {
                                            setEditWorkLines((prev) => {
                                                const target = prev.find(
                                                    (p) => p.key === line.key
                                                )
                                                if (!target) return prev
                                                if (target.serverId) {
                                                    return prev.map((p) =>
                                                        p.key === line.key
                                                            ? {
                                                                  ...p,
                                                                  deleted: true,
                                                              }
                                                            : p
                                                    )
                                                }
                                                return prev.filter(
                                                    (p) => p.key !== line.key
                                                )
                                            })
                                        }
                                    )
                                )}
                        </div>
                        <Button
                            className="mt-3"
                            variant="default"
                            size="sm"
                            onClick={() =>
                                setEditWorkLines((prev) => [
                                    ...prev,
                                    {
                                        key: newDraftKey(),
                                        name: '',
                                        address: '',
                                        status: 'active',
                                        progress: null,
                                    },
                                ])
                            }
                        >
                            + Añadir obra
                        </Button>
                        <div className="flex justify-between gap-3 mt-8">
                            <Button
                                variant="default"
                                onClick={() => setEditWizardStep(1)}
                            >
                                Atrás
                            </Button>
                            <Button
                                variant="solid"
                                color="orange-500"
                                onClick={handleSaveEditWizard}
                                loading={isSavingEdit}
                            >
                                Guardar cambios
                            </Button>
                        </div>
                    </>
                )}
            </Dialog>

            <NuevaCotizacionModal
                isOpen={isNewQuoteOpen}
                onClose={() => setIsNewQuoteOpen(false)}
                onCreateQuote={handleCreateQuoteFromModal}
                clients={clients}
                works={worksAll}
                concreteTypes={CONCRETE_TYPES}
                initialClientId={selectedClient?.id ?? null}
            />
        </div>
    )
}

export default ClientesObras
