<script setup lang="ts">
import { useUserStore } from '@/store/user.store';
import { initFlowbite } from 'flowbite';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { loadLocaleMessages } from './i18n';
import { RouterView } from 'vue-router';

const { locale } = useI18n()
const userStore = useUserStore()

onMounted(async () => {
    initFlowbite();

    const language = localStorage.getItem('locale')
    if (language) {
        await loadLocaleMessages(language)
        locale.value = language
        document.documentElement.lang = language
    }else {
        await loadLocaleMessages('en-US')
        locale.value = 'en-US'
        document.documentElement.lang = 'en-US'
    }

    /** Mock User Store */

    userStore.setUser({
        first_name: "John",
        last_name: "Doe",
        telegram_id: 123456789,
        is_bot: false,
        is_active: true,
        id: "123",
        role: "manager",
        username: "JohnDoe"
    })
})

</script>

<template>
    <RouterView />
</template>
