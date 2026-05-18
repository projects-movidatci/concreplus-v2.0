import type { ReactNode } from 'react'
import { Notification, toast } from '@/components/ui'
import {
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineInformationCircle,
    HiOutlineXCircle,
} from 'react-icons/hi'

type ToastKind = 'success' | 'error' | 'warning' | 'info'

const iconClassByKind: Record<ToastKind, string> = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    warning: 'text-amber-600',
    info: 'text-sky-600',
}

function iconByKind(kind: ToastKind) {
    const cls = `text-xl ${iconClassByKind[kind]}`
    if (kind === 'success') return <HiOutlineCheckCircle className={cls} />
    if (kind === 'error') return <HiOutlineXCircle className={cls} />
    if (kind === 'warning') return <HiOutlineExclamationCircle className={cls} />
    return <HiOutlineInformationCircle className={cls} />
}

function showToast(kind: ToastKind, title: string, message: ReactNode) {
    toast.push(
        <Notification
            type={kind === 'error' ? 'danger' : kind}
            title={title}
            customIcon={iconByKind(kind)}
            closable
            duration={3500}
        >
            {message}
        </Notification>
    )
}

export const toastSuccess = (title: string, message: ReactNode) =>
    showToast('success', title, message)

export const toastError = (title: string, message: ReactNode) =>
    showToast('error', title, message)

export const toastWarning = (title: string, message: ReactNode) =>
    showToast('warning', title, message)

export const toastInfo = (title: string, message: ReactNode) =>
    showToast('info', title, message)
