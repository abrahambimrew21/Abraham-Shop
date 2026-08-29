import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', {
    state: () => ({
        mode: 'dark' as ThemeMode,
    }),

    actions: {
        init() {
            const saved = localStorage.getItem('theme') as ThemeMode | null
            const preferred = saved ?? 'dark'
            this.apply(preferred)
        },

        apply(mode: ThemeMode) {
            this.mode = mode
            localStorage.setItem('theme', mode)
            if (mode === 'dark') {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        },

        toggle() {
            this.apply(this.mode === 'dark' ? 'light' : 'dark')
        },
    },

    getters: {
        isDark: (state) => state.mode === 'dark',
    },
})
