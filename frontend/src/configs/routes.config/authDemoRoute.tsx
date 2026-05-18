import { lazy } from 'react'
import { AUTH_PREFIX_PATH } from '@/constants/route.constant'
import { ALL_APP_ROLES } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const authDemoRoute: Routes = [
    {
        key: 'authentication.signInSimple',
        path: `${AUTH_PREFIX_PATH}/sign-in-simple`,
        component: lazy(() => import('@/views/auth-demo/SignIn/SignInSimple')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.signInSide',
        path: `${AUTH_PREFIX_PATH}/sign-in-side`,
        component: lazy(() => import('@/views/auth-demo/SignIn/SignInSide')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.signInCover',
        path: `${AUTH_PREFIX_PATH}/sign-in-cover`,
        component: lazy(() => import('@/views/auth-demo/SignIn/SignInCover')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.signUpSimple',
        path: `${AUTH_PREFIX_PATH}/sign-up-simple`,
        component: lazy(() => import('@/views/auth-demo/SignUp/SignUpSimple')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.signUpSide',
        path: `${AUTH_PREFIX_PATH}/sign-up-side`,
        component: lazy(() => import('@/views/auth-demo/SignUp/SignUpSide')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.signUpCover',
        path: `${AUTH_PREFIX_PATH}/sign-up-cover`,
        component: lazy(() => import('@/views/auth-demo/SignUp/SignUpCover')),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.forgotPasswordSimple',
        path: `${AUTH_PREFIX_PATH}/forgot-password-simple`,
        component: lazy(
            () =>
                import('@/views/auth-demo/ForgotPassword/ForgotPasswordSimple')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.forgotPasswordSide',
        path: `${AUTH_PREFIX_PATH}/forgot-password-side`,
        component: lazy(
            () => import('@/views/auth-demo/ForgotPassword/ForgotPasswordSide')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.forgotPasswordCover',
        path: `${AUTH_PREFIX_PATH}/forgot-password-cover`,
        component: lazy(
            () => import('@/views/auth-demo/ForgotPassword/ForgotPasswordCover')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.resetPasswordSimple',
        path: `${AUTH_PREFIX_PATH}/reset-password-simple`,
        component: lazy(
            () => import('@/views/auth-demo/ResetPassword/ResetPasswordSimple')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.resetPasswordSide',
        path: `${AUTH_PREFIX_PATH}/reset-password-side`,
        component: lazy(
            () => import('@/views/auth-demo/ResetPassword/ResetPasswordSide')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'authentication.resetPasswordCover',
        path: `${AUTH_PREFIX_PATH}/reset-password-cover`,
        component: lazy(
            () => import('@/views/auth-demo/ResetPassword/ResetPasswordCover')
        ),
        authority: ALL_APP_ROLES,
        meta: {
            layout: 'blank',
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
]

export default authDemoRoute
