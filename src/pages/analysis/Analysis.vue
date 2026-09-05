<script lang="ts" setup>
import KenatDateSelector from '@/components/KenatDateSelector.vue';
import { db, seedDatabase } from '@/database';
import { formatEthDate } from '@/libs/formatEthDate';
import type { Restock } from '@/types/inventory.type';
import type { Shop } from '@/types/shop.type';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// ── Data ─────────────────────────────────────────────────────────────────────
const allSales = ref<Shop[]>([]);
const allRestock = ref<Restock[]>([]);

// ── Date range state ──────────────────────────────────────────────────────────
const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);

const dateFrom = ref<string>(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
const dateTo   = ref<string>(fmt(today));

const applyPreset = (preset: 'today' | '7d' | '30d' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
        dateFrom.value = fmt(now);
        dateTo.value   = fmt(now);
    } else if (preset === '7d') {
        const d = new Date(now); d.setDate(d.getDate() - 6);
        dateFrom.value = fmt(d);
        dateTo.value   = fmt(now);
    } else if (preset === '30d') {
        const d = new Date(now); d.setDate(d.getDate() - 29);
        dateFrom.value = fmt(d);
        dateTo.value   = fmt(now);
    } else {
        dateFrom.value = '2000-01-01';
        dateTo.value   = fmt(now);
    }
};

// ── Filtered data ─────────────────────────────────────────────────────────────
const filteredSales = computed(() => {
    const from = new Date(dateFrom.value);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo.value);
    to.setHours(23, 59, 59, 999);
    return allSales.value.filter(s => {
        const d = new Date(s.dateSold);
        return d >= from && d <= to;
    });
});

const filteredRestock = computed(() => {
    const from = new Date(dateFrom.value);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo.value);
    to.setHours(23, 59, 59, 999);
    return allRestock.value.filter(r => {
        const d = new Date(r.restockDate);
        return d >= from && d <= to;
    });
});

// ── KPI cards ─────────────────────────────────────────────────────────────────
const kpiRevenue  = computed(() => filteredSales.value.reduce((a, s) => a + (s.totalRevenue || 0), 0));
const kpiCost     = computed(() => filteredSales.value.reduce((a, s) => a + (s.totalCost    || 0), 0));
const kpiMargin   = computed(() => filteredSales.value.reduce((a, s) => a + (s.margin       || 0), 0));
const kpiUnitsSold = computed(() => filteredSales.value.reduce((a, s) => a + (s.quantity    || 0), 0));

// ── Revenue Trend chart ───────────────────────────────────────────────────────
const trendSeries = computed(() => {
    if (filteredSales.value.length === 0) {
        return [
            { name: t('analysis.revenue_series'), data: [{ x: t('analysis.today'), y: 0 }] },
            { name: t('analysis.margin_series'),  data: [{ x: t('analysis.today'), y: 0 }] },
        ];
    }
    const map: Record<string, { revenue: number; margin: number }> = {};
    filteredSales.value.forEach(s => {
        const key = new Date(s.dateSold).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!map[key]) map[key] = { revenue: 0, margin: 0 };
        map[key].revenue += s.totalRevenue || 0;
        map[key].margin  += s.margin       || 0;
    });
    const dates = Object.keys(map);
    return [
        { name: t('analysis.revenue_series'), data: dates.map(d => ({ x: d, y: map[d].revenue })) },
        { name: t('analysis.margin_series'),  data: dates.map(d => ({ x: d, y: map[d].margin  })) },
    ];
});

const trendOptions = computed(() => ({
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
    colors: ['#6366f1', '#10b981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { type: 'category', labels: { style: { colors: '#9ca3af' } } },
    yaxis: { labels: { style: { colors: '#9ca3af' } } },
    grid: { borderColor: '#374151' },
    theme: { mode: 'dark' },
    tooltip: { theme: 'dark' },
}));

// ── Top Products donut ────────────────────────────────────────────────────────
const productBreakdown = computed(() => {
    const map: Record<string, number> = {};
    filteredSales.value.forEach(s => {
        const name = s.inventory?.item?.name || 'Item';
        map[name] = (map[name] || 0) + (s.totalRevenue || 0);
    });
    const labels = Object.keys(map).length ? Object.keys(map) : [t('analysis.no_sales')];
    const series = Object.keys(map).length ? Object.values(map) : [1];
    return { labels, series };
});

const donutOptions = computed(() => ({
    chart: { type: 'donut', fontFamily: 'Inter, sans-serif', background: 'transparent' },
    labels: productBreakdown.value.labels,
    colors: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
    theme: { mode: 'dark' },
    legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
}));

// ── Restock cost bar chart ────────────────────────────────────────────────────
const restockBarSeries = computed(() => {
    if (filteredRestock.value.length === 0) {
        return [{ name: t('analysis.restock_costs'), data: [{ x: t('analysis.today'), y: 0 }] }];
    }
    const map: Record<string, number> = {};
    filteredRestock.value.forEach(r => {
        const key = new Date(r.restockDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map[key] = (map[key] || 0) + (r.acquiredPrice * r.quantity);
    });
    const dates = Object.keys(map);
    return [{ name: t('analysis.restock_costs'), data: dates.map(d => ({ x: d, y: map[d] })) }];
});

const restockBarOptions = computed(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
    colors: ['#f59e0b'],
    dataLabels: { enabled: false },
    xaxis: { type: 'category', labels: { style: { colors: '#9ca3af' } } },
    yaxis: { labels: { style: { colors: '#9ca3af' } } },
    grid: { borderColor: '#374151' },
    theme: { mode: 'dark' },
    tooltip: { theme: 'dark' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
}));

// ── Load data ─────────────────────────────────────────────────────────────────
onMounted(async () => {
    await seedDatabase();
    allSales.value   = await db.sales.toArray();
    allRestock.value = await db.restockHistory.toArray();
});
</script>

<template>
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-24 px-4">

        <!-- Page Header -->
        <div class="flex flex-col gap-1 pt-2">
            <h1 class="text-2xl font-bold text-heading">{{ t('analysis.title') }}</h1>
            <p class="text-sm text-body">{{ t('analysis.subtitle') }}</p>
        </div>

        <!-- Date Range Controls -->
        <div class="flex flex-wrap items-end gap-3 p-4 bg-neutral-primary-soft border border-default rounded-base shadow-xs">
            <!-- Preset buttons -->
            <div class="flex flex-wrap gap-2">
                <button @click="applyPreset('today')"
                    class="px-3 py-1.5 text-xs font-medium rounded-base border border-default-medium bg-neutral-secondary-medium text-body hover:bg-neutral-tertiary-medium hover:text-heading transition-colors">
                    {{ t('analysis.preset_today') }}
                </button>
                <button @click="applyPreset('7d')"
                    class="px-3 py-1.5 text-xs font-medium rounded-base border border-default-medium bg-neutral-secondary-medium text-body hover:bg-neutral-tertiary-medium hover:text-heading transition-colors">
                    {{ t('analysis.preset_7days') }}
                </button>
                <button @click="applyPreset('30d')"
                    class="px-3 py-1.5 text-xs font-medium rounded-base border border-default-medium bg-neutral-secondary-medium text-body hover:bg-neutral-tertiary-medium hover:text-heading transition-colors">
                    {{ t('analysis.preset_30days') }}
                </button>
                <button @click="applyPreset('all')"
                    class="px-3 py-1.5 text-xs font-medium rounded-base border border-default-medium bg-neutral-secondary-medium text-body hover:bg-neutral-tertiary-medium hover:text-heading transition-colors">
                    {{ t('analysis.preset_all') }}
                </button>
            </div>

            <!-- Custom date inputs -->
            <div class="flex flex-wrap items-center gap-2 ms-auto">
                <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-body whitespace-nowrap">{{ t('analysis.date_from') }}</label>
                    <kenat-date-selector key="332" v-on:selected-date="(dateFromHere: Date) => {console.log('From here:', dateFromHere); dateFrom = fmt(dateFromHere)}"/>
                    <!-- <input type="date" v-model="dateFrom"
                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-2.5 py-1.5 shadow-xs" /> -->
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-body whitespace-nowrap">{{ t('analysis.date_to') }}</label>
                    <kenat-date-selector key="331" v-on:selected-date="(dateToHere: Date) => {console.log('To here:', dateToHere); dateTo = fmt(dateToHere)}"/>
                    <!-- <input type="date" v-model="dateTo"
                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-2.5 py-1.5 shadow-xs" /> -->
                </div>
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Revenue -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">{{ t('analysis.total_revenue') }}</span>
                    <div class="w-9 h-9 rounded-base bg-brand-softer border border-brand-subtle flex items-center justify-center text-fg-brand-strong">
                        <v-icon name="bi-clipboard-data" scale="1" />
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-heading">{{ kpiRevenue }}</span>
                    <span class="text-xs text-body ms-1">{{ t('common.br') }}</span>
                </div>
            </div>

            <!-- Cost -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">{{ t('analysis.total_cost') }}</span>
                    <div class="w-9 h-9 rounded-base bg-danger-softer border border-danger-subtle flex items-center justify-center text-danger-strong">
                        <v-icon name="md-receiptlong-round" scale="1" />
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-heading">{{ kpiCost }}</span>
                    <span class="text-xs text-body ms-1">{{ t('common.br') }}</span>
                </div>
            </div>

            <!-- Profit -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">{{ t('analysis.total_margin') }}</span>
                    <div class="w-9 h-9 rounded-base bg-success-softer border border-success-subtle flex items-center justify-center text-fg-success">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-fg-success">+{{ kpiMargin }}</span>
                    <span class="text-xs text-body ms-1">{{ t('common.br') }}</span>
                </div>
            </div>

            <!-- Units Sold -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">{{ t('analysis.total_units_sold') }}</span>
                    <div class="w-9 h-9 rounded-base bg-brand-softer border border-brand-subtle flex items-center justify-center text-fg-brand-strong">
                        <v-icon name="md-shoppingcart-round" scale="1" />
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-heading">{{ kpiUnitsSold }}</span>
                    <span class="text-xs text-body ms-1">{{ t('common.units') }}</span>
                </div>
            </div>
        </div>

        <!-- Charts Row 1: Trend + Top Products -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Revenue & Profit Trend -->
            <div class="lg:col-span-2 bg-neutral-primary-soft border border-default p-5 rounded-base shadow-xs">
                <div class="mb-4 border-b border-default pb-3">
                    <h3 class="text-lg font-semibold text-heading">{{ t('analysis.revenue_trend') }}</h3>
                    <p class="text-xs text-body">{{ t('analysis.revenue_trend_subtitle') }}</p>
                </div>
                <div v-if="filteredSales.length > 0 || true">
                    <apexchart type="area" height="280" :options="trendOptions" :series="trendSeries" />
                </div>
                <div v-if="filteredSales.length === 0" class="text-center py-4 text-xs text-body">
                    {{ t('analysis.no_sales') }}
                </div>
            </div>

            <!-- Top Products Donut -->
            <div class="bg-neutral-primary-soft border border-default p-5 rounded-base shadow-xs">
                <div class="mb-4 border-b border-default pb-3">
                    <h3 class="text-lg font-semibold text-heading">{{ t('analysis.top_products') }}</h3>
                    <p class="text-xs text-body">{{ t('analysis.top_products_subtitle') }}</p>
                </div>
                <div class="flex justify-center items-center h-64">
                    <apexchart type="donut" width="100%" height="260" :options="donutOptions" :series="productBreakdown.series" />
                </div>
                <div v-if="filteredSales.length === 0" class="text-center text-xs text-body -mt-2">
                    {{ t('analysis.no_sales') }}
                </div>
            </div>
        </div>

        <!-- Charts Row 2: Restock Cost Bar -->
        <div class="bg-neutral-primary-soft border border-default p-5 rounded-base shadow-xs">
            <div class="mb-4 border-b border-default pb-3">
                <h3 class="text-lg font-semibold text-heading">{{ t('analysis.restock_costs') }}</h3>
                <p class="text-xs text-body">{{ t('analysis.restock_costs_subtitle') }}</p>
            </div>
            <apexchart type="bar" height="240" :options="restockBarOptions" :series="restockBarSeries" />
            <div v-if="filteredRestock.length === 0" class="text-center py-2 text-xs text-body">
                {{ t('analysis.no_restock') }}
            </div>
        </div>

        <!-- Table Full Data -->
        <div class="relative w-full max-w-full overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <table class="w-full text-sm text-left rtl:text-right text-body">
                <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_item_name') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_unit') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_qty_sold') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_unit_price') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_total_revenue') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_margin') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_time_sold') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="sale in filteredSales" :key="sale.id" class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">{{ sale.inventory.item.name }}</th>
                        <td class="px-6 py-4">{{ sale.inventory.item.unit }}</td>
                        <td class="px-6 py-4 font-semibold">{{ sale.quantity }}</td>
                        <td class="px-6 py-4">{{ sale.sellingPrice }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 font-bold text-heading">{{ sale.totalRevenue }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 font-medium text-fg-success">+{{ sale.margin }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 text-xs text-body">{{ formatEthDate(sale.dateSold) }}</td>
                    </tr>
                    <tr v-if="filteredSales.length === 0">
                        <td colspan="7" class="px-6 py-8 text-center text-body">{{ t('sold_items.no_records_recent') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
</template>
