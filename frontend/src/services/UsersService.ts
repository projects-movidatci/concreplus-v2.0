import ApiService from './ApiService'

export type SystemUser = {
    id: number
    email: string
    fullName: string
    isActive: boolean
    roles: string[]
}

export async function apiGetUsers() {
    const response = await ApiService.fetchData<{ data: SystemUser[] }>({
        url: '/users',
        method: 'get',
    })
    return response.data.data
}

export async function apiGetAssignableRoles() {
    const response = await ApiService.fetchData<{ data: string[] }>({
        url: '/users/roles/assignable',
        method: 'get',
    })
    return response.data.data
}

export async function apiCreateUser(payload: {
    email: string
    password: string
    fullName: string
    role: string
}) {
    const response = await ApiService.fetchData<{ data: SystemUser }>({
        url: '/users',
        method: 'post',
        data: payload,
    })
    return response.data.data
}

export async function apiUpdateUser(
    id: number,
    payload: {
        email?: string
        fullName?: string
        password?: string
        isActive?: boolean
        role?: string
    }
) {
    const response = await ApiService.fetchData<{ data: SystemUser }>({
        url: `/users/${id}`,
        method: 'patch',
        data: payload,
    })
    return response.data.data
}

export async function apiDeactivateUser(id: number) {
    await ApiService.fetchData({
        url: `/users/${id}`,
        method: 'delete',
    })
}
