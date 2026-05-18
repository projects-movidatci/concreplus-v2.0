import { lazy } from 'react'
import { PAGES_PREFIX_PATH } from '@/constants/route.constant'
import { ALL_APP_ROLES } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const pagesRoute: Routes = [
    {
        key: 'pages.welcome',
        path: `${PAGES_PREFIX_PATH}/welcome`,
        component: lazy(() => import('@/views/pages/Welcome')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'pages.accessDenied',
        path: '/access-denied',
        component: lazy(() => import('@/views/pages/AccessDenied')),
        authority: ALL_APP_ROLES,
    },
]

export default pagesRoute
