import { createElement, isValidElement } from 'react'
import type { ReactNode } from 'react'
import ToastWrapper from './ToastWrapper'
import { PLACEMENT } from '../utils/constants'
import type { ToastProps } from './ToastWrapper'
import { NotificationPlacement } from '../@types/placement'
import Notification from '../Notification/Notification'

export const toastDefaultProps = {
    placement: PLACEMENT.TOP_END,
    offsetX: 30,
    offsetY: 30,
    transitionType: 'scale',
    block: false,
}

export interface Toast {
    push(
        message: ReactNode,
        options?: ToastProps
    ): string | undefined | Promise<string | undefined>
    remove(key: string): void
    removeAll(): void
}

const defaultWrapperId = 'default'
const wrappers = new Map()

function castPlacment(placement: NotificationPlacement) {
    if (/\top\b/.test(placement)) {
        return 'top-full'
    }

    if (/\bottom\b/.test(placement)) {
        return 'bottom-full'
    }
}

async function createWrapper(wrapperId: string, props: ToastProps) {
    const [wrapper] = await ToastWrapper.getInstance(props)

    wrappers.set(wrapperId || defaultWrapperId, wrapper)

    return wrapper
}

function getWrapper(wrapperId?: string) {
    if (wrappers.size === 0) {
        return null
    }
    return wrappers.get(wrapperId || defaultWrapperId)
}

/** `ToastWrapper` usa `cloneElement`; los strings no son elementos válidos y quedan con `type: undefined`. */
function wrapToastMessage(message: ReactNode): ReactNode {
    if (isValidElement(message)) {
        return message
    }
    if (typeof message === 'string' || typeof message === 'number') {
        return createElement(
            Notification,
            { duration: 3000 },
            String(message)
        )
    }
    return message
}

const toast: Toast = (message: ReactNode) => toast.push(message)

toast.push = (message, options = toastDefaultProps as ToastProps) => {
    let id = options.placement
    if (options.block) {
        id = castPlacment(options.placement as NotificationPlacement)
    }

    const node = wrapToastMessage(message)

    const wrapper = getWrapper(id)

    if (wrapper?.current) {
        return wrapper.current.push(node)
    }

    return createWrapper(id ?? '', options).then((ref) => {
        return ref.current?.push(node)
    })
}

toast.remove = (key) => {
    wrappers.forEach((elm) => elm.current.remove(key))
}

toast.removeAll = () => {
    wrappers.forEach((elm) => elm.current.removeAll())
}

export default toast
