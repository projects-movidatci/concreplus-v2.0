import { supabase } from './SupabaseService'
import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
} from '@/@types/auth'

export async function apiSignIn(data: SignInCredential) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.userName,
        password: data.password,
    })

    if (error) {
        throw new Error(error.message)
    }

    return {
        data: {
            token: authData.session.access_token,
            user: {
                userName: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
                authority: authData.user.user_metadata?.authority || ['vendedor'],
                email: authData.user.email,
                avatar: authData.user.user_metadata?.avatar || '',
            }
        }
    }
}

export async function apiSignUp(data: SignUpCredential) {
    const { data: authData, error } = await supabase.auth.signUp({
        email: data.userName,
        password: data.password,
    })

    if (error) {
        throw new Error(error.message)
    }

    return {
        data: {
            token: authData.session?.access_token || '',
            user: {
                userName: data.userName,
                authority: ['vendedor'],
                email: data.email,
                avatar: '',
            }
        }
    }
}

export async function apiSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    return { data: { ok: true } }
}

export async function apiForgotPassword(data: ForgotPassword) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email)
    if (error) throw new Error(error.message)
    return { data: { ok: true } }
}

export async function apiResetPassword(data: ResetPassword) {
    // Requires handling hash in url
    return { data: { ok: true } }
}
