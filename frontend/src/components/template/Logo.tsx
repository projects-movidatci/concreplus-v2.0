import classNames from 'classnames'
import { HiOutlineTruck } from 'react-icons/hi'
import type { CommonProps } from '@/@types/common'

const BRAND_NAME = 'ConcrePlus'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    const isDark = mode === 'dark'
    const textClass = isDark ? 'text-white' : 'text-gray-900'

    return (
        <div
            className={classNames(
                'logo flex items-center gap-3',
                className
            )}
            style={{
                ...style,
                ...(logoWidth !== 'auto' && { width: logoWidth }),
            }}
        >
            <div
                className={classNames(
                    'flex items-center justify-center rounded-xl flex-shrink-0',
                    'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg',
                    type === 'full' ? 'w-10 h-10' : 'w-10 h-10'
                )}
            >
                <HiOutlineTruck
                    className={classNames('text-white', imgClass)}
                    size={type === 'full' ? 22 : 22}
                />
            </div>
            {type === 'full' && (
                <span
                    className={classNames(
                        'font-bold text-xl truncate',
                        textClass
                    )}
                >
                    {BRAND_NAME}
                </span>
            )}
        </div>
    )
}

export default Logo
