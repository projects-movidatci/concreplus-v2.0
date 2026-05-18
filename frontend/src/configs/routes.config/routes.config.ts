import authRoute from './authRoute'
import entryRoute from './entryRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes: Routes = [...entryRoute]
