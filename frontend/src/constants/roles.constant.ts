import { APP_PREFIX_PATH } from '@/constants/route.constant'

/** Nombres de rol en BD / JWT (minúsculas). */
export const VENDEDOR = 'vendedor'
export const SUPERVISOR = 'supervisor'
export const ADMIN = 'admin'
export const DESPACHADOR = 'despachador'

/** Pantallas que no son solo para vendedor (dashboard, programación, etc.). */
export const SUPERVISOR_AND_ADMIN: string[] = [SUPERVISOR, ADMIN]

/** Pantallas de despacho. */
export const DESPACHO_ROLES: string[] = [SUPERVISOR, ADMIN, DESPACHADOR]

/** Cualquier rol de la aplicación (sustituye al antiguo `user`). */
export const ALL_APP_ROLES: string[] = [VENDEDOR, SUPERVISOR, ADMIN, DESPACHADOR]

export function getDefaultRouteForAuthority(authority: string[]): string {
    if (authority.includes(ADMIN) || authority.includes(SUPERVISOR)) {
        return `${APP_PREFIX_PATH}/dashboard`
    }
    return `${APP_PREFIX_PATH}/clients-works`
}

/** Programar pedidos / ir a programación (no aplica a vendedor). */
export function canScheduleOrders(authority: string[]): boolean {
    return authority.includes(ADMIN) || authority.includes(SUPERVISOR)
}

/** Gestión de usuarios del sistema (supervisor con restricciones, admin completo). */
export function canAccessUsuariosScreen(authority: string[]): boolean {
    return authority.includes(ADMIN) || authority.includes(SUPERVISOR)
}
