import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import { useAppSelector } from '@/store'
import { ADMIN, SUPERVISOR } from '@/constants/roles.constant'
import {
    apiCreateUser,
    apiDeactivateUser,
    apiGetAssignableRoles,
    apiGetUsers,
    apiUpdateUser,
    type SystemUser,
} from '@/services/UsersService'
import { toastError, toastSuccess } from '@/views/concreto/toast'
import {
    HiOutlinePlus,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineShieldCheck,
    HiOutlineLockClosed,
    HiOutlineSearch,
    HiOutlineRefresh,
    HiOutlineUserGroup,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'

function roleLabel(role: string) {
    if (role === 'admin') return 'Administrador'
    if (role === 'supervisor') return 'Supervisor'
    if (role === 'vendedor') return 'Vendedor'
    return role
}

function roleBadgeClass(role: string) {
    if (role === 'admin') {
        return 'bg-orange-100 text-orange-900 border-orange-200'
    }
    if (role === 'supervisor') {
        return 'bg-sky-100 text-sky-900 border-sky-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
}

function primaryRole(roles: string[]) {
    if (roles.includes('admin')) return 'admin'
    if (roles.includes('supervisor')) return 'supervisor'
    if (roles.includes('vendedor')) return 'vendedor'
    return roles[0] ?? ''
}

function targetIsPrivileged(roles: string[]) {
    return roles.some((r) => r === 'admin' || r === 'supervisor')
}

const Usuarios = () => {
    const [users, setUsers] = useState<SystemUser[]>([])
    const [assignableRoles, setAssignableRoles] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<SystemUser | null>(null)
    const [form, setForm] = useState({
        email: '',
        fullName: '',
        password: '',
        role: 'vendedor' as string,
    })
    const [saving, setSaving] = useState(false)
    const [pendingDeactivate, setPendingDeactivate] =
        useState<SystemUser | null>(null)
    const [deactivating, setDeactivating] = useState(false)

    const authority = useAppSelector((s) => s.auth.user.authority)
    const currentEmail = useAppSelector((s) => s.auth.user.email)
    const isAdmin = authority.includes(ADMIN)
    const isSupervisor = authority.includes(SUPERVISOR) && !isAdmin

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [list, roles] = await Promise.all([
                apiGetUsers(),
                apiGetAssignableRoles(),
            ])
            setUsers(list)
            setAssignableRoles(roles.length > 0 ? roles : ['vendedor'])
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo cargar',
                err?.response?.data?.message || 'Error al cargar usuarios'
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const canMutateRow = (u: SystemUser) => {
        if (isAdmin) return true
        if (isSupervisor) return !targetIsPrivileged(u.roles)
        return false
    }

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users
        return users.filter(
            (u) =>
                u.fullName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
        )
    }, [users, search])

    const stats = useMemo(() => {
        const active = users.filter((u) => u.isActive).length
        const inactive = users.length - active
        return { total: users.length, active, inactive }
    }, [users])

    const openCreate = () => {
        setEditing(null)
        setForm({
            email: '',
            fullName: '',
            password: '',
            role: assignableRoles[0] ?? 'vendedor',
        })
        setModalOpen(true)
    }

    const openEdit = (u: SystemUser) => {
        if (!canMutateRow(u)) return
        setEditing(u)
        setForm({
            email: u.email,
            fullName: u.fullName,
            password: '',
            role: primaryRole(u.roles) || 'vendedor',
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.email.trim() || !form.fullName.trim()) {
            toastError('Datos incompletos', 'Email y nombre son obligatorios.')
            return
        }
        if (!editing && (!form.password || form.password.length < 6)) {
            toastError(
                'Contraseña',
                'La contraseña debe tener al menos 6 caracteres.'
            )
            return
        }
        setSaving(true)
        try {
            if (editing) {
                await apiUpdateUser(editing.id, {
                    fullName: form.fullName.trim(),
                    role: form.role,
                    ...(form.password ? { password: form.password } : {}),
                })
                toastSuccess('Usuario actualizado', 'Los cambios se guardaron.')
            } else {
                await apiCreateUser({
                    email: form.email.trim(),
                    fullName: form.fullName.trim(),
                    password: form.password,
                    role: form.role,
                })
                toastSuccess('Usuario creado', 'El usuario quedó registrado.')
            }
            setModalOpen(false)
            await load()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo guardar',
                err?.response?.data?.message || 'Error al guardar'
            )
        } finally {
            setSaving(false)
        }
    }

    const requestDeactivate = (u: SystemUser) => {
        if (!canMutateRow(u)) return
        if (u.email === currentEmail) {
            toastError(
                'Acción no permitida',
                'No puedes desactivar tu propio usuario.'
            )
            return
        }
        setPendingDeactivate(u)
    }

    const confirmDeactivate = async () => {
        if (!pendingDeactivate) return
        setDeactivating(true)
        try {
            await apiDeactivateUser(pendingDeactivate.id)
            toastSuccess(
                'Usuario desactivado',
                'El usuario ya no podrá iniciar sesión.'
            )
            setPendingDeactivate(null)
            await load()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo desactivar',
                err?.response?.data?.message || 'Error al desactivar'
            )
        } finally {
            setDeactivating(false)
        }
    }

    const handleReactivate = async (u: SystemUser) => {
        if (!canMutateRow(u)) return
        try {
            await apiUpdateUser(u.id, { isActive: true })
            toastSuccess('Usuario reactivado', `${u.fullName} puede volver a entrar.`)
            await load()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            toastError(
                'No se pudo reactivar',
                err?.response?.data?.message || 'Error al reactivar'
            )
        }
    }

    const roleSelectDisabled = Boolean(
        editing && !canMutateRow(editing)
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Usuarios del sistema
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base max-w-2xl">
                        Crea usuarios y asigna rol:{' '}
                        <strong>Vendedor</strong>, <strong>Supervisor</strong> o{' '}
                        <strong>Administrador</strong>.
                    </p>
                </div>
                <Button
                    variant="solid"
                    color="orange-500"
                    className="shadow-md shrink-0"
                    onClick={openCreate}
                    disabled={assignableRoles.length === 0 || loading}
                >
                    <span className="flex items-center gap-2">
                        <HiOutlinePlus className="text-lg" />
                        <span>Nuevo usuario</span>
                    </span>
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-l-4 border-gray-400">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total
                    </p>
                    <p className="text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
                        <HiOutlineUserGroup className="text-gray-400" />
                        {stats.total}
                    </p>
                </Card>
                <Card className="border-l-4 border-emerald-500">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Activos
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                        {stats.active}
                    </p>
                </Card>
                <Card className="border-l-4 border-gray-300">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Inactivos
                    </p>
                    <p className="text-2xl font-black text-gray-600 mt-1">
                        {stats.inactive}
                    </p>
                </Card>
            </div>

            <Card bordered={false} bodyClass="p-0">
                <div className="relative border-b border-gray-100 px-4 py-3">
                    <HiOutlineSearch className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                </div>
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size={40} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200 bg-gray-50/80">
                                    <th className="text-left py-3 px-4 font-bold text-gray-700 text-sm">
                                        Nombre
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700 text-sm">
                                        Email
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-700 text-sm">
                                        Rol
                                    </th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700 text-sm">
                                        Estado
                                    </th>
                                    <th className="text-center py-3 px-4 font-bold text-gray-700 text-sm">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-12 text-center text-gray-500"
                                        >
                                            {users.length === 0
                                                ? 'No hay usuarios registrados.'
                                                : 'Ningún resultado para tu búsqueda.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const locked =
                                            isSupervisor &&
                                            targetIsPrivileged(u.roles)
                                        const pr = primaryRole(u.roles)
                                        return (
                                            <tr
                                                key={u.id}
                                                className={`border-b border-gray-100 transition-colors ${
                                                    locked
                                                        ? 'bg-gray-50/70'
                                                        : 'hover:bg-orange-50/40'
                                                }`}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {locked && (
                                                            <span title="Gestionable solo por un administrador">
                                                                <HiOutlineLockClosed className="text-gray-400 shrink-0" />
                                                            </span>
                                                        )}
                                                        <span className="font-semibold text-gray-900">
                                                            {u.fullName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-700 text-sm">
                                                    {u.email}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                                                            pr
                                                        )}`}
                                                    >
                                                        <HiOutlineShieldCheck className="text-sm opacity-80" />
                                                        {roleLabel(pr)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            u.isActive
                                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                        }`}
                                                    >
                                                        {u.isActive
                                                            ? 'Activo'
                                                            : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !canMutateRow(u)
                                                            }
                                                            title={
                                                                !canMutateRow(u)
                                                                    ? 'Solo un administrador puede editar este usuario'
                                                                    : 'Editar'
                                                            }
                                                            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                            onClick={() =>
                                                                openEdit(u)
                                                            }
                                                        >
                                                            <HiOutlinePencilAlt className="text-lg" />
                                                        </button>
                                                        {u.isActive ? (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    !canMutateRow(
                                                                        u
                                                                    ) ||
                                                                    u.email ===
                                                                        currentEmail
                                                                }
                                                                title={
                                                                    u.email ===
                                                                    currentEmail
                                                                        ? 'No puedes desactivarte a ti mismo'
                                                                        : 'Desactivar acceso'
                                                                }
                                                                className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                                onClick={() =>
                                                                    requestDeactivate(
                                                                        u
                                                                    )
                                                                }
                                                            >
                                                                <HiOutlineTrash className="text-lg" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    !canMutateRow(
                                                                        u
                                                                    )
                                                                }
                                                                title="Reactivar usuario"
                                                                className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                                onClick={() =>
                                                                    void handleReactivate(
                                                                        u
                                                                    )
                                                                }
                                                            >
                                                                <HiOutlineRefresh className="text-lg" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onRequestClose={() => setModalOpen(false)}
                width={580}
            >
                <div className="border-b border-gray-100 pb-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                        {editing ? 'Editar usuario' : 'Nuevo usuario'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {editing
                            ? 'Actualiza nombre, rol o contraseña. El email no se puede cambiar.'
                            : isSupervisor
                              ? 'Se creará un usuario con rol Vendedor (único disponible para supervisores).'
                              : 'Completa los datos y elige el rol correspondiente.'}
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Nombre completo{' '}
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    fullName: e.target.value,
                                }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            autoComplete="name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    email: e.target.value,
                                }))
                            }
                            disabled={!!editing}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {editing ? (
                                <>
                                    Nueva contraseña{' '}
                                    <span className="text-gray-400 font-normal">
                                        (opcional)
                                    </span>
                                </>
                            ) : (
                                <>
                                    Contraseña{' '}
                                    <span className="text-red-500">*</span>
                                </>
                            )}
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    password: e.target.value,
                                }))
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            autoComplete="new-password"
                            placeholder={
                                editing
                                    ? 'Dejar vacío para no cambiar'
                                    : 'Mínimo 6 caracteres'
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Rol <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.role}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    role: e.target.value,
                                }))
                            }
                            disabled={roleSelectDisabled}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
                        >
                            {assignableRoles.map((r) => (
                                <option key={r} value={r}>
                                    {roleLabel(r)}
                                </option>
                            ))}
                        </select>
                        {roleSelectDisabled && (
                            <p className="text-xs text-amber-700 mt-1">
                                No tienes permiso para cambiar el rol de este
                                usuario.
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                    <Button
                        variant="default"
                        onClick={() => setModalOpen(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="solid"
                        color="orange-500"
                        loading={saving}
                        onClick={() => void handleSave()}
                    >
                        {editing ? 'Guardar cambios' : 'Crear usuario'}
                    </Button>
                </div>
            </Dialog>

            <Dialog
                isOpen={pendingDeactivate != null}
                onClose={() => setPendingDeactivate(null)}
                onRequestClose={() => setPendingDeactivate(null)}
                width={440}
            >
                <div className="flex gap-3">
                    <div className="shrink-0 rounded-full bg-rose-100 p-2 text-rose-600">
                        <HiOutlineExclamationCircle className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">
                            Desactivar usuario
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                            El usuario{' '}
                            <span className="font-semibold text-gray-900">
                                {pendingDeactivate?.fullName}
                            </span>{' '}
                            ({pendingDeactivate?.email}) no podrá iniciar sesión
                            hasta que un administrador o supervisor con permisos lo
                            reactive.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                    <Button
                        variant="default"
                        onClick={() => setPendingDeactivate(null)}
                        disabled={deactivating}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="solid"
                        color="rose-500"
                        loading={deactivating}
                        onClick={() => void confirmDeactivate()}
                    >
                        Desactivar usuario
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}

export default Usuarios
