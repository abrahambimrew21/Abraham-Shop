<script lang="ts" setup>
import { useUserStore } from '@/store/user.store';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();

const handleLogout = () => {
    userStore.logout();
    router.push('/login');
};
</script>
<template>
    <div class="flex flex-col gap-2 w-full items-center">
        <h2 class="text-xl font-medium text-primary-900">Settings</h2>
        <div class="w-96 bg-neutral-primary-soft border border-default rounded-base shadow-xs">
            <ul role="list" class="space-y-3 p-6 divide-y divide-default">
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-palette-round" class="me-1.5 shrink-0" />
                        <span>Theme</span>
                    </div>
                    <span class="text-body font-medium">Dark</span>
                </li>
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-language-round" class="me-1.5 shrink-0" />
                        <span>Language</span>
                    </div>
                    <span class="text-body font-medium">English</span>
                </li>
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-person-round" class="me-1.5 shrink-0" />
                        <router-link to="/setting/users">Users</router-link>
                    </div>
                    <span class="text-body font-medium"></span>
                </li>
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="bi-clipboard-data" class="me-1.5 shrink-0" />
                        <router-link to="/setting/shop-items">Items</router-link>
                    </div>
                    <span class="text-body font-medium"></span>
                </li>
                <li class="flex items-center justify-between pt-3 cursor-pointer" @click="handleLogout">
                    <div class="flex items-center text-danger font-medium">
                        <svg class="w-5 h-5 me-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span>Logout</span>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>
