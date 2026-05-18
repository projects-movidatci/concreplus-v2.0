import SignInForm from './SignInForm'
import Logo from '@/components/template/Logo'

const SignIn = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-10 md:px-10 md:py-12">
                <div className="flex flex-col items-center text-center mb-8">
                    <Logo className="mb-4" />
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        ConcrePlus
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Sistema de Gestión de Concreto
                    </p>
                </div>

                <SignInForm disableSubmit={false} />

                <div className="mt-8 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-400">
                        ConcrePlus · Versión 1.0 · Enero 2025
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SignIn
