import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
    legacy: false,
    locale: 'en-US',
    fallbackLocale: 'en-US',
    messages: {}
})

const loadedLocales: string[] = []

export async function loadLocaleMessages(locale: string) {
    if (loadedLocales.includes(locale)) return nextTick()
        
    const messages = await import(`./locales/${locale}.json`)
    i18n.global.setLocaleMessage(locale, messages)
    loadedLocales.push(locale)

    return nextTick()
}

export default i18n