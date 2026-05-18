import { DOCS_PREFIX_PATH } from '@/constants/route.constant'
import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { ALL_APP_ROLES } from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const docNavigationConfig: NavigationTree[] = [
    {
        key: 'guide',
        path: '',
        title: 'Guide',
        translateKey: 'nav.docs.guide',
        icon: 'guide',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ALL_APP_ROLES,
        subMenu: [
            {
                key: 'docs.documentation',
                path: `${DOCS_PREFIX_PATH}/documentation/introduction`,
                title: 'Documentation',
                translateKey: 'nav.docs.documentation',
                icon: 'documentation',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_APP_ROLES,
                subMenu: [],
            },
            {
                key: 'docs.sharedComponentDoc',
                path: `${DOCS_PREFIX_PATH}/shared-component-doc/action-link`,
                title: 'Shared Component',
                translateKey: 'nav.docs.sharedComponentDoc',
                icon: 'sharedComponentDoc',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_APP_ROLES,
                subMenu: [],
            },
            {
                key: 'docs.utilsDoc',
                path: `${DOCS_PREFIX_PATH}/utils-doc/use-auth`,
                title: 'Utilities',
                translateKey: 'nav.docs.utilsDoc',
                icon: 'utilsDoc',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_APP_ROLES,
                subMenu: [],
            },
            {
                key: 'docs.changeLog',
                path: `${DOCS_PREFIX_PATH}/changelog`,
                title: 'Changelog',
                translateKey: 'nav.docs.changeLog',
                icon: 'changeLog',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_APP_ROLES,
                subMenu: [],
            },
        ],
    },
]

export default docNavigationConfig
