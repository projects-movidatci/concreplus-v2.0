import { lazy } from 'react'
import { UI_COMPONENTS_PREFIX_PATH } from '@/constants/route.constant'
import { ALL_APP_ROLES } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const uiComponentsRoute: Routes = [
    {
        key: 'uiComponent.common.button',
        path: `${UI_COMPONENTS_PREFIX_PATH}/button`,
        component: lazy(() => import('@/views/ui-components/common/Button')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.common.grid',
        path: `${UI_COMPONENTS_PREFIX_PATH}/grid`,
        component: lazy(() => import('@/views/ui-components/common/Grid')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.common.typography',
        path: `${UI_COMPONENTS_PREFIX_PATH}/typography`,
        component: lazy(
            () => import('@/views/ui-components/common/Typography')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.common.icons',
        path: `${UI_COMPONENTS_PREFIX_PATH}/icons`,
        component: lazy(() => import('@/views/ui-components/common/Icons')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.alert',
        path: `${UI_COMPONENTS_PREFIX_PATH}/alert`,
        component: lazy(() => import('@/views/ui-components/feedback/Alert')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.dialog',
        path: `${UI_COMPONENTS_PREFIX_PATH}/dialog`,
        component: lazy(() => import('@/views/ui-components/feedback/Dialog')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.drawer',
        path: `${UI_COMPONENTS_PREFIX_PATH}/drawer`,
        component: lazy(() => import('@/views/ui-components/feedback/Drawer')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.progress',
        path: `${UI_COMPONENTS_PREFIX_PATH}/progress`,
        component: lazy(
            () => import('@/views/ui-components/feedback/Progress')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.skeleton',
        path: `${UI_COMPONENTS_PREFIX_PATH}/skeleton`,
        component: lazy(
            () => import('@/views/ui-components/feedback/Skeleton')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.spinner',
        path: `${UI_COMPONENTS_PREFIX_PATH}/spinner`,
        component: lazy(() => import('@/views/ui-components/feedback/Spinner')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.feedback.toast',
        path: `${UI_COMPONENTS_PREFIX_PATH}/toast`,
        component: lazy(() => import('@/views/ui-components/feedback/Toast')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.avatar',
        path: `${UI_COMPONENTS_PREFIX_PATH}/avatar`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Avatar')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.badge',
        path: `${UI_COMPONENTS_PREFIX_PATH}/badge`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Badge')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.calendar',
        path: `${UI_COMPONENTS_PREFIX_PATH}/calendar`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Calendar')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.cards',
        path: `${UI_COMPONENTS_PREFIX_PATH}/cards`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Cards')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.table',
        path: `${UI_COMPONENTS_PREFIX_PATH}/table`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Table')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.tag',
        path: `${UI_COMPONENTS_PREFIX_PATH}/tag`,
        component: lazy(() => import('@/views/ui-components/data-display/Tag')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.timeline',
        path: `${UI_COMPONENTS_PREFIX_PATH}/timeline`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Timeline')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.dataDisplay.tooltip',
        path: `${UI_COMPONENTS_PREFIX_PATH}/tooltip`,
        component: lazy(
            () => import('@/views/ui-components/data-display/Tooltip')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.checkbox',
        path: `${UI_COMPONENTS_PREFIX_PATH}/checkbox`,
        component: lazy(() => import('@/views/ui-components/forms/Checkbox')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.datePicker',
        path: `${UI_COMPONENTS_PREFIX_PATH}/date-picker`,
        component: lazy(() => import('@/views/ui-components/forms/DatePicker')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.formControl',
        path: `${UI_COMPONENTS_PREFIX_PATH}/form-control`,
        component: lazy(
            () => import('@/views/ui-components/forms/FormControl')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.input',
        path: `${UI_COMPONENTS_PREFIX_PATH}/input`,
        component: lazy(() => import('@/views/ui-components/forms/Input')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.inputGroup',
        path: `${UI_COMPONENTS_PREFIX_PATH}/input-group`,
        component: lazy(() => import('@/views/ui-components/forms/InputGroup')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.radio',
        path: `${UI_COMPONENTS_PREFIX_PATH}/radio`,
        component: lazy(() => import('@/views/ui-components/forms/Radio')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.segment',
        path: `${UI_COMPONENTS_PREFIX_PATH}/segment`,
        component: lazy(() => import('@/views/ui-components/forms/Segment')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.select',
        path: `${UI_COMPONENTS_PREFIX_PATH}/select`,
        component: lazy(() => import('@/views/ui-components/forms/Select')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.switcher',
        path: `${UI_COMPONENTS_PREFIX_PATH}/switcher`,
        component: lazy(() => import('@/views/ui-components/forms/Switcher')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.timeInput',
        path: `${UI_COMPONENTS_PREFIX_PATH}/time-input`,
        component: lazy(() => import('@/views/ui-components/forms/TimeInput')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.forms.upload',
        path: `${UI_COMPONENTS_PREFIX_PATH}/upload`,
        component: lazy(() => import('@/views/ui-components/forms/Upload')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.navigation.dropdown',
        path: `${UI_COMPONENTS_PREFIX_PATH}/dropdown`,
        component: lazy(
            () => import('@/views/ui-components/navigation/Dropdown')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.navigation.menu',
        path: `${UI_COMPONENTS_PREFIX_PATH}/menu`,
        component: lazy(() => import('@/views/ui-components/navigation/Menu')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.navigation.pagination',
        path: `${UI_COMPONENTS_PREFIX_PATH}/pagination`,
        component: lazy(
            () => import('@/views/ui-components/navigation/Pagination')
        ),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.navigation.steps',
        path: `${UI_COMPONENTS_PREFIX_PATH}/steps`,
        component: lazy(() => import('@/views/ui-components/navigation/Steps')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.navigation.tabs',
        path: `${UI_COMPONENTS_PREFIX_PATH}/tabs`,
        component: lazy(() => import('@/views/ui-components/navigation/Tabs')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.graph.charts',
        path: `${UI_COMPONENTS_PREFIX_PATH}/graph/charts`,
        component: lazy(() => import('@/views/ui-components/graph/Charts')),
        authority: ALL_APP_ROLES,
    },
    {
        key: 'uiComponent.graph.maps',
        path: `${UI_COMPONENTS_PREFIX_PATH}/graph/maps`,
        component: lazy(() => import('@/views/ui-components/graph/Maps')),
        authority: ALL_APP_ROLES,
    },
]

export default uiComponentsRoute
