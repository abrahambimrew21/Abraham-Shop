<script lang="ts" setup>
import { initTabs, initTooltips } from 'flowbite';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

onMounted(() => {
    initTabs();
    initTooltips();
})

</script>
<template>

<div class="fixed z-50 w-full h-16 max-w-lg -translate-x-1/2 bg-neutral-primary-soft border border-default rounded-full bottom-4 left-1/2">
    <div class="grid h-full max-w-lg grid-cols-5 mx-auto">
        <router-link to="/" data-tooltip-target="tooltip-home" class="inline-flex flex-col items-center justify-center px-5 rounded-s-full hover:bg-neutral-secondary-medium group">
                <v-icon name="md-home-round" scale="1" :class="route.path === '/' ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Home</span>
        </router-link>
        <div id="tooltip-home" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            Home
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <router-link to="/inventory" data-tooltip-target="tooltip-inventory" class="inline-flex flex-col items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
            <v-icon name="md-warehouse-round" scale="1" :class="route.path.startsWith('/inventory') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
            <span class="sr-only">Inventory</span>
        </router-link>
        <div id="tooltip-inventory" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            Inventory
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        
        <div class="flex items-center justify-center">
            <button data-tooltip-target="tooltip-new" type="button" class="inline-flex items-center justify-center text-white bg-brand hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs rounded-full w-8 h-8 focus:outline-none">
                <v-icon name="md-add-round" scale="1" class="w-6 h-6" />
                <span class="sr-only">New item</span>
            </button>
        </div>
        <div id="tooltip-new" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            Create new item
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <router-link to="/shop" data-tooltip-target="tooltip-shop" class="inline-flex flex-col items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
            <v-icon name="md-shop2-round" scale="1" :class="route.path.startsWith('/shop') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
            <span class="sr-only">Shop</span>
        </router-link>
        <div id="tooltip-shop" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            Shop
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <router-link to="/settings" data-tooltip-target="tooltip-settings" class="inline-flex flex-col items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
            <v-icon name="md-settings-round" scale="1" :class="route.path.startsWith('/setting') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
            <span class="sr-only">Settings</span>
        </router-link>
        <div id="tooltip-settings" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            Settings
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
    </div>
</div>

</template>