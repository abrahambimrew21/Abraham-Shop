<script lang="ts" setup>
import { initTooltips } from 'flowbite';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();

onMounted(() => {
    initTooltips();
})
</script>
<template>

<div class="fixed z-50 w-full h-16 max-w-lg -translate-x-1/2 bg-neutral-primary-soft border border-default rounded-full bottom-4 left-1/2">
    <div class="grid h-full max-w-lg grid-cols-5 mx-auto">

        <!-- Home -->
        <router-link to="/" data-tooltip-target="tooltip-home" class="inline-flex flex-col items-center justify-center px-5 rounded-s-full hover:bg-neutral-secondary-medium group">
            <v-icon name="md-home-round" scale="1" :class="route.path === '/' ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
            <span class="sr-only">{{ t('nav.home') }}</span>
        </router-link>
        <div id="tooltip-home" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            {{ t('nav.home') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>

        <!-- Inventory -->
        <router-link to="/inventory" data-tooltip-target="tooltip-inventory" class="inline-flex flex-col items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
            <v-icon name="md-warehouse-round" scale="1" :class="route.path.startsWith('/inventory') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
            <span class="sr-only">{{ t('nav.inventory') }}</span>
        </router-link>
        <div id="tooltip-inventory" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            {{ t('nav.inventory') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>

        <!-- Analysis (centre) -->
        <div class="flex items-center justify-center">
            <router-link to="/analysis" data-tooltip-target="tooltip-analysis"
                :class="route.path.startsWith('/analysis') ? 'bg-brand-strong' : 'bg-brand hover:bg-brand-strong'"
                class="inline-flex items-center justify-center text-white focus:ring-4 focus:ring-brand-medium shadow-xs rounded-full w-10 h-10 focus:outline-none transition-colors">
                <v-icon name="md-analytics-round" scale="1" class="w-6 h-6" />
                <span class="sr-only">{{ t('nav.analysis') }}</span>
            </router-link>
        </div>
        <div id="tooltip-analysis" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            {{ t('nav.analysis') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>

        <!-- Shop -->
        <router-link to="/shop" data-tooltip-target="tooltip-shop" class="inline-flex flex-col items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
            <v-icon name="md-shop2-round" scale="1" :class="route.path.startsWith('/shop') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
            <span class="sr-only">{{ t('nav.shop') }}</span>
        </router-link>
        <div id="tooltip-shop" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            {{ t('nav.shop') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>

        <!-- Settings -->
        <router-link to="/settings" data-tooltip-target="tooltip-settings" class="inline-flex flex-col items-center justify-center px-5 rounded-e-full hover:bg-neutral-secondary-medium group">
            <v-icon name="md-settings-round" scale="1" :class="route.path.startsWith('/settings') ? 'text-fg-brand' : 'text-body'" class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
            <span class="sr-only">{{ t('nav.settings') }}</span>
        </router-link>
        <div id="tooltip-settings" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
            {{ t('nav.settings') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>

    </div>
</div>

</template>
