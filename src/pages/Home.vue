<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useUserStore } from '@/store/user.store';
import { db, seedDatabase } from '@/database';
import type { Shop } from '@/types/shop.type';
import type { Inventory } from '@/types/inventory.type';

const userStore = useUserStore();
const currentUser = computed(() => userStore.getUser);

const sales = ref<Shop[]>([]);
const inventory = ref<Inventory[]>([]);

const loadDashboardData = async () => {
    await seedDatabase();
    sales.value = await db.sales.toArray();
    inventory.value = await db.inventory.toArray();
};

onMounted(async () => {
    await loadDashboardData();
});

// KPI Calculations
const totalSoldItems = computed(() => sales.value.reduce((acc, curr) => acc + (curr.quantity || 0), 0));
const totalRevenue = computed(() => sales.value.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0));
const totalMargin = computed(() => sales.value.reduce((acc, curr) => acc + (curr.margin || 0), 0));
const lowStockCount = computed(() => inventory.value.filter(inv => inv.quantity <= inv.runOutThreshhold).length);

// Area Chart Series (Formatted as robust { x, y } data points for ApexCharts)
const areaChartSeries = computed(() => {
    if (sales.value.length === 0) {
        return [
            { name: 'Revenue (Br)', data: [{ x: 'Today', y: 0 }] },
            { name: 'Margin (Br)', data: [{ x: 'Today', y: 0 }] }
        ];
    }

    const dateMap: Record<string, { revenue: number; margin: number }> = {};
    sales.value.forEach(s => {
        const dateStr = new Date(s.dateSold).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateMap[dateStr]) {
            dateMap[dateStr] = { revenue: 0, margin: 0 };
        }
        dateMap[dateStr].revenue += (s.totalRevenue || 0);
        dateMap[dateStr].margin += (s.margin || 0);
    });

    const dates = Object.keys(dateMap);

    return [
        {
            name: 'Revenue (Br)',
            data: dates.map(d => ({ x: d, y: dateMap[d].revenue }))
        },
        {
            name: 'Margin (Br)',
            data: dates.map(d => ({ x: d, y: dateMap[d].margin }))
        }
    ];
});

const areaChartOptions = computed(() => ({
    chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
        background: 'transparent'
    },
    colors: ['#6366f1', '#10b981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
        type: 'category',
        labels: { style: { colors: '#9ca3af' } }
    },
    yaxis: {
        labels: { style: { colors: '#9ca3af' } }
    },
    grid: { borderColor: '#374151' },
    theme: { mode: 'dark' },
    tooltip: {
        theme: 'dark'
    }
}));

// Donut Chart Series
const productBreakdown = computed(() => {
    const itemMap: Record<string, number> = {};
    sales.value.forEach(s => {
        const name = s.inventory?.item?.name || 'Item';
        itemMap[name] = (itemMap[name] || 0) + (s.totalRevenue || 0);
    });

    const labels = Object.keys(itemMap).length > 0 ? Object.keys(itemMap) : ['No Sales'];
    const series = Object.keys(itemMap).length > 0 ? Object.values(itemMap) : [1];

    return { labels, series };
});

const donutChartOptions = computed(() => ({
    chart: {
        type: 'donut',
        fontFamily: 'Inter, sans-serif',
        background: 'transparent'
    },
    labels: productBreakdown.value.labels,
    colors: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
    theme: { mode: 'dark' },
    legend: { position: 'bottom', labels: { colors: '#9ca3af' } }
}));

const donutChartSeries = computed(() => productBreakdown.value.series);
</script>

<template>
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-24 px-4">
        <!-- User Welcome Header Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-neutral-primary-soft border border-default rounded-base shadow-xs">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-brand-softer border border-brand-subtle flex items-center justify-center text-fg-brand-strong text-2xl font-bold uppercase">
                    {{ currentUser?.name ? currentUser.name.charAt(0) : 'U' }}
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-2xl font-bold text-heading">
                            Welcome back, {{ currentUser?.name || 'User' }}!
                        </h1>
                        <span class="bg-brand-softer border border-brand-subtle text-fg-brand-strong text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                            {{ currentUser?.role ? currentUser.role.replace('_', ' ') : 'Manager' }}
                        </span>
                    </div>
                    <p class="text-sm text-body mt-0.5">Here is an overview of your shop performance and revenue.</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <router-link to="/shop" class="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-strong rounded-base shadow-xs transition-colors">
                    Go to Shop
                </router-link>
                <router-link to="/inventory" class="px-4 py-2 text-sm font-medium text-body bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium border border-default-medium rounded-base transition-colors">
                    Manage Inventory
                </router-link>
            </div>
        </div>

        <!-- Key Performance Indicator (KPI) Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Sold Items -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">Total Sold Items</span>
                    <div class="w-9 h-9 rounded-base bg-brand-softer border border-brand-subtle flex items-center justify-center text-fg-brand-strong">
                        <v-icon name="md-shoppingcart-round" scale="1" />
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-heading">{{ totalSoldItems }}</span>
                    <span class="text-xs text-body ms-1">units sold</span>
                </div>
            </div>

            <!-- Total Revenue -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">Total Revenue</span>
                    <div class="w-9 h-9 rounded-base bg-brand-softer border border-brand-subtle flex items-center justify-center text-fg-brand-strong">
                        <v-icon name="bi-clipboard-data" scale="1" />
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-heading">{{ totalRevenue }}</span>
                    <span class="text-xs text-body ms-1">Br</span>
                </div>
            </div>

            <!-- Total Margin -->
            <div class="p-5 bg-neutral-primary-soft border border-default rounded-base shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider">Total Margin (Profit)</span>
                    <div class="w-9 h-9 rounded-base bg-success-softer border border-success-subtle flex items-center justify-center text-fg-success">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                    </div>
                </div>
                <div>
                    <span class="text-3xl font-extrabold text-fg-success">+{{ totalMargin }}</span>
                    <span class="text-xs text-body ms-1">Br</span>
                </div>
            </div>

            <!-- Inventory Low Stock Alert (Clickable Link to /inventory/low-stock) -->
            <router-link to="/inventory/low-stock" class="p-5 bg-neutral-primary-soft border border-default hover:border-danger-subtle rounded-base shadow-xs flex flex-col justify-between group transition-all">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-body uppercase tracking-wider group-hover:text-danger-strong transition-colors">Low Stock Warning</span>
                    <div :class="lowStockCount > 0 ? 'bg-danger-softer border-danger-subtle text-danger-strong' : 'bg-brand-softer border-brand-subtle text-fg-brand-strong'"
                        class="w-9 h-9 rounded-base border flex items-center justify-center">
                        <v-icon name="md-warehouse-round" scale="1" />
                    </div>
                </div>
                <div>
                    <span :class="lowStockCount > 0 ? 'text-danger-strong' : 'text-heading'" class="text-3xl font-extrabold">{{ lowStockCount }}</span>
                    <span class="text-xs text-body ms-1">items low in stock →</span>
                </div>
            </router-link>
        </div>

        <!-- Dashboard Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Revenue & Profit Trend Area Chart -->
            <div class="lg:col-span-2 bg-neutral-primary-soft border border-default p-5 rounded-base shadow-xs">
                <div class="flex items-center justify-between mb-4 border-b border-default pb-3">
                    <div>
                        <h3 class="text-lg font-semibold text-heading">Revenue & Profit Overview</h3>
                        <p class="text-xs text-body">Financial earnings and profit margins over time</p>
                    </div>
                </div>
                <apexchart type="area" height="280" :options="areaChartOptions" :series="areaChartSeries"></apexchart>
            </div>

            <!-- Product Revenue Breakdown Donut Chart -->
            <div class="bg-neutral-primary-soft border border-default p-5 rounded-base shadow-xs">
                <div class="flex items-center justify-between mb-4 border-b border-default pb-3">
                    <div>
                        <h3 class="text-lg font-semibold text-heading">Revenue by Product</h3>
                        <p class="text-xs text-body">Sales distribution across items</p>
                    </div>
                </div>
                <div class="flex justify-center items-center h-64">
                    <apexchart type="donut" width="100%" height="260" :options="donutChartOptions" :series="donutChartSeries"></apexchart>
                </div>
            </div>
        </div>
    </div>
</template>