<script lang="ts" setup>
import { useUserStore } from '@/store/user.store';
import { useThemeStore } from '@/store/theme.store';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { loadLocaleMessages } from '@/i18n';

const { t, locale } = useI18n()
const userStore = useUserStore();
const themeStore = useThemeStore();
const router = useRouter();

const handleLogout = () => {
    userStore.logout();
    router.push('/login');
};

const toggleTheme = () => {
    themeStore.toggle();
};

const setLanguage = async (lang: string) => {
    await loadLocaleMessages(lang);
    locale.value = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('locale', lang);
};
</script>
<template>
    <div class="flex flex-col gap-2 w-full items-center">
        <h2 class="text-xl font-medium text-primary-900 dark:text-primary-500">{{ t('settings.title') }}</h2>
        <div class="w-96 bg-neutral-primary-soft border border-default rounded-base shadow-xs">
            <ul role="list" class="space-y-3 p-6 divide-y divide-default">

                <!-- Theme Toggle -->
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-palette-round" class="me-1.5 shrink-0" />
                        <span>{{ t('settings.theme') }}</span>
                    </div>
                    <button
                        @click="toggleTheme"
                        class="flex items-center gap-2 px-3 py-1.5 rounded-base border border-default-medium bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium transition-colors text-sm font-medium text-heading"
                        :aria-label="themeStore.isDark ? t('settings.theme_dark') : t('settings.theme_light')"
                    >
                        <span v-if="themeStore.isDark" class="flex items-center gap-1.5">
                            <!-- Moon icon -->
                            <svg class="w-4 h-4 text-fg-brand" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                            </svg>
                            {{ t('settings.theme_dark') }}
                        </span>
                        <span v-else class="flex items-center gap-1.5">
                            <!-- Sun icon -->
                            <svg class="w-4 h-4 text-fg-brand" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
                            </svg>
                            {{ t('settings.theme_light') }}
                        </span>
                    </button>
                </li>

                <!-- Language Switcher -->
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-language-round" class="me-1.5 shrink-0" />
                        <span>{{ t('settings.language') }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button
                            @click="setLanguage('en-US')"
                            :class="locale === 'en-US'
                                ? 'bg-brand text-white border-transparent'
                                : 'bg-neutral-secondary-medium text-body border-default-medium hover:bg-neutral-tertiary-medium'"
                            class="px-2.5 py-1 text-xs font-semibold rounded-base border transition-colors"
                        >
                            EN
                        </button>
                        <button
                            @click="setLanguage('am-ET')"
                            :class="locale === 'am-ET'
                                ? 'bg-brand text-white border-transparent'
                                : 'bg-neutral-secondary-medium text-body border-default-medium hover:bg-neutral-tertiary-medium'"
                            class="px-2.5 py-1 text-xs font-semibold rounded-base border transition-colors"
                        >
                            አማ
                        </button>
                    </div>
                </li>

                <!-- Users Link -->
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="md-person-round" class="me-1.5 shrink-0" />
                        <router-link to="/setting/users" class="hover:text-heading transition-colors">
                            {{ t('settings.users') }}
                        </router-link>
                    </div>
                </li>

                <!-- Items Link -->
                <li class="flex items-center justify-between pb-3">
                    <div class="flex items-center text-body">
                        <v-icon name="bi-clipboard-data" class="me-1.5 shrink-0" />
                        <router-link to="/setting/shop-items" class="hover:text-heading transition-colors">
                            {{ t('settings.items') }}
                        </router-link>
                    </div>
                </li>

                <!-- Logout -->
                <li class="flex items-center justify-between pt-3 cursor-pointer" @click="handleLogout">
                    <div class="flex items-center text-danger font-medium">
                        <svg class="w-5 h-5 me-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span>{{ t('settings.logout') }}</span>
                    </div>
                </li>

            </ul>
        </div>
    </div>
</template>
