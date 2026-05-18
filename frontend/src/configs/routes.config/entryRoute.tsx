import { lazy } from 'react'
import { APP_PREFIX_PATH } from '@/constants/route.constant'
import {
    ALL_APP_ROLES,
    SUPERVISOR_AND_ADMIN,
} from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const Placeholder = lazy(() => import('@/views/Placeholder/Placeholder'))

const entryRoute: Routes = [
    {
        key: 'app.dashboard',
        path: `${APP_PREFIX_PATH}/dashboard`,
        component: lazy(() => import('@/views/Dashboard/Dashboard')),
        authority: SUPERVISOR_AND_ADMIN,
    },
    {
        key: 'app.usuarios',
        path: `${APP_PREFIX_PATH}/usuarios`,
        component: lazy(() => import('@/views/Usuarios/Usuarios')),
        authority: SUPERVISOR_AND_ADMIN,
    },
    {
        key: 'app.clientsAndWorks',
        path: `${APP_PREFIX_PATH}/clients-works`,
        component: lazy(() => import('@/views/ClientesObras/ClientesObras')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'app.cotizaciones',
        path: `${APP_PREFIX_PATH}/cotizaciones`,
        component: lazy(
            () => import('@/views/Cotizaciones/Cotizaciones')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'app.pedidos',
        path: `${APP_PREFIX_PATH}/pedidos`,
        component: lazy(() => import('@/views/Pedidos/Pedidos')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'app.programacion',
        path: `${APP_PREFIX_PATH}/programacion`,
        component: lazy(() => import('@/views/Programacion/Programacion')),
        authority: SUPERVISOR_AND_ADMIN,
    },
    {
        key: 'app.despacho',
        path: `${APP_PREFIX_PATH}/despacho`,
        component: lazy(() => import('@/views/Despacho/Despacho')),
        authority: SUPERVISOR_AND_ADMIN,
    },
    {
        key: 'app.trazabilidad',
        path: `${APP_PREFIX_PATH}/trazabilidad`,
        component: lazy(() => import('@/views/Trazabilidad/Trazabilidad')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'app.cobranza',
        path: `${APP_PREFIX_PATH}/cobranza`,
        component: lazy(() => import('@/views/Cobranza/Cobranza')),
        authority: SUPERVISOR_AND_ADMIN,
    },
    {
        key: 'app.facturacion',
        path: `${APP_PREFIX_PATH}/facturacion`,
        component: lazy(() => import('@/views/Facturacion/Facturacion')),
        authority: SUPERVISOR_AND_ADMIN,
    },
]

export default entryRoute
