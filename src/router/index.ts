import { authGuard } from '@/libs/authGuard';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const allRoutes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('@/pages/Layout.vue'),
        beforeEnter: authGuard,
        children: [
            {
                name: 'Home',
                path: '',
                component: () => import('@/pages/Home.vue')
            },
            {
                name: 'Shop',
                path: '/shop',
                component: () => import('@/pages/shop/Shop.vue')
            },
            {
                name: 'SoldItems',
                path: '/shop/sold/:id?',
                component: () => import('@/pages/shop/SoldItems.vue')
            },
            {
                name: 'Inventory',
                path: '/inventory',
                component: () => import('@/pages/inventory/Inventory.vue')
            },
            {
                name: 'LowStockInventory',
                path: '/inventory/low-stock',
                component: () => import('@/pages/inventory/LowStock.vue')
            },
            {
                name: 'RestockHistory',
                path: '/inventory/history/:id?',
                component: () => import('@/pages/inventory/History.vue')
            },
            {
                name: 'Analysis',
                path: '/analysis',
                component: () => import('@/pages/analysis/Analysis.vue')
            },
            {
                name: 'Setting',
                path: '/settings',
                component: () => import('@/pages/setting/Setting.vue')
            },
            {
                name: 'ShopItems',
                path: '/setting/shop-items',
                component: () => import('@/pages/setting/ShopItems.vue')
            },
            {
                name: 'Users',
                path: '/setting/users',
                component: () => import('@/pages/setting/Users.vue')
            }
        ]
    },
    {
        name: 'Login',
        path: '/login',
        component: () => import('@/pages/Login.vue')
    },
    { name: 'Unauthorized', path: '/unauthorized', component: () => import('@/pages/_system/UnAuthorized.vue') },
    { name: 'NotFound', path: '/not-found', component: () => import('@/pages/_system/NotFound.vue') }
]

export const router = createRouter({
    history: createWebHistory(),
    routes: allRoutes,
})
