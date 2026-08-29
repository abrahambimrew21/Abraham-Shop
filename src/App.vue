<script setup lang="ts">
import { useThemeStore } from '@/store/theme.store';
import { initFlowbite } from 'flowbite';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView } from 'vue-router';
import { loadLocaleMessages } from './i18n';

const { locale } = useI18n()
const themeStore = useThemeStore()

onMounted(async () => {
    initFlowbite();

    // Initialize theme (reads localStorage, applies dark/light class to <html>)
    themeStore.init()

    const language = localStorage.getItem('locale')
    if (language) {
        await loadLocaleMessages(language)
        locale.value = language
        document.documentElement.lang = language
    } else {
        await loadLocaleMessages('en-US')
        locale.value = 'en-US'
        document.documentElement.lang = 'en-US'
    }

})

</script>

<template>
    <RouterView />
</template>
