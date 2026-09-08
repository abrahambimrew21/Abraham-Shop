import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import i18n from './i18n'
import { OhVueIcon, addIcons } from "oh-vue-icons";
import { router } from './router';

import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada';
import VueApexCharts from "vue3-apexcharts";
import {
    MdHomeRound,
    MdAddRound,
    MdSettingsRound,
    MdWarehouseRound,
    MdShop2Round,
    MdPaletteRound,
    MdLanguageRound,
    MdPersonRound,
    BiClipboardData,
    MdHistoryRound,
    MdEditRound,
    MdDeleteRound,
    MdShoppingcartRound,
    MdReceiptlongRound,
    MdAnalyticsRound,
    MdLockopenRound,
    MdLockRound
} from "oh-vue-icons/icons";

addIcons(
    MdHomeRound,
    MdAddRound,
    MdSettingsRound,
    MdWarehouseRound,
    MdShop2Round,
    MdPaletteRound,
    MdLanguageRound,
    MdPersonRound,
    BiClipboardData,
    MdHistoryRound,
    MdEditRound,
    MdDeleteRound,
    MdShoppingcartRound,
    MdReceiptlongRound,
    MdAnalyticsRound,
    MdLockopenRound,
    MdLockRound
);

const pinia = createPinia()
const app = createApp(App)

app.use(pinia);
app.use(i18n);
app.use(PiniaColada, {
    queryOptions: {
        staleTime: 1000 * 60 * 5,
    },
    mutationOptions: {},
})
app.use(router);
app.use(VueApexCharts);

app.component("v-icon", OhVueIcon);

app.mount('#app')
