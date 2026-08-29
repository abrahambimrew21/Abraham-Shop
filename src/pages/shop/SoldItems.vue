<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { Inventory } from '@/types/inventory.type';
import type { Shop } from '@/types/shop.type';
import { db, seedDatabase } from '@/database';

const { t } = useI18n();
const route = useRoute();
const inventoryId = computed(() => route.params.id as string | undefined);

const searchQuery = ref('');
const salesList = ref<Shop[]>([]);
const targetInventory = ref<Inventory | null>(null);

const loadSalesData = async () => {
    await seedDatabase();
    salesList.value = await db.sales.toArray();
    if (inventoryId.value) {
        const found = await db.inventory.get(inventoryId.value);
        targetInventory.value = found || null;
    } else {
        targetInventory.value = null;
    }
};

onMounted(async () => { await loadSalesData(); });
watch(inventoryId, async () => { await loadSalesData(); });

const filteredSales = computed(() => {
    let logs = salesList.value;
    if (inventoryId.value) {
        logs = logs.filter(s => s.inventory?.id === inventoryId.value || s.inventory?.item?.id === inventoryId.value);
    } else {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        logs = logs.filter(s => new Date(s.dateSold) >= twentyFourHoursAgo);
    }
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim();
        logs = logs.filter(s =>
            s.inventory?.item?.name?.toLowerCase().includes(q) ||
            s.inventory?.varient?.name?.toLowerCase().includes(q)
        );
    }
    return logs.sort((a, b) => new Date(b.dateSold).getTime() - new Date(a.dateSold).getTime());
});

const totalQuantitySold = computed(() => filteredSales.value.reduce((acc, curr) => acc + (curr.quantity || 0), 0));
const totalRevenue = computed(() => filteredSales.value.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0));
const totalMargin = computed(() => filteredSales.value.reduce((acc, curr) => acc + (curr.margin || 0), 0));

const formatDate = (dateInput: Date | string) => {
    if (!dateInput) return '';
    return new Date(dateInput).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
    <div class="flex flex-col gap-4 w-full items-center pb-20">
        <!-- Header -->
        <div class="flex items-center gap-2">
            <router-link to="/shop" class="text-body hover:text-heading flex items-center me-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </router-link>
            <h2 class="text-xl font-medium text-primary-900 dark:text-primary-500">
                {{ targetInventory
                    ? t('sold_items.title_specific', { item: targetInventory.item.name, variant: targetInventory.varient.name })
                    : t('sold_items.title_recent') }}
            </h2>
        </div>

        <!-- Summary Metrics -->
        <div class="w-full max-w-4xl grid grid-cols-3 gap-4 px-4">
            <div class="bg-neutral-primary-soft border border-default p-4 rounded-base text-center shadow-xs">
                <span class="text-xs text-body uppercase font-medium">{{ t('sold_items.total_sold') }}</span>
                <p class="text-2xl font-bold text-heading mt-1">{{ totalQuantitySold }} {{ t('common.units') }}</p>
            </div>
            <div class="bg-neutral-primary-soft border border-default p-4 rounded-base text-center shadow-xs">
                <span class="text-xs text-body uppercase font-medium">{{ t('sold_items.total_revenue') }}</span>
                <p class="text-2xl font-bold text-fg-brand-strong mt-1">{{ totalRevenue }} {{ t('common.br') }}</p>
            </div>
            <div class="bg-neutral-primary-soft border border-default p-4 rounded-base text-center shadow-xs">
                <span class="text-xs text-body uppercase font-medium">{{ t('sold_items.total_margin') }}</span>
                <p class="text-2xl font-bold text-fg-success mt-1">+{{ totalMargin }} {{ t('common.br') }}</p>
            </div>
        </div>

        <!-- Search -->
        <div class="p-4">
            <label for="input-group-1" class="sr-only">{{ t('common.search') }}</label>
            <div class="relative">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input type="text" id="input-group-1" v-model="searchQuery"
                    class="block max-w-96 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
                    :placeholder="t('sold_items.search_placeholder')">
            </div>
        </div>

        <!-- Single Item: Timeline -->
        <div v-if="inventoryId" class="w-full px-4 md:px-20">
            <ol v-if="filteredSales.length > 0" class="relative border-s border-default w-full">
                <li v-for="sale in filteredSales" :key="sale.id" class="mb-10 ms-6">
                    <span class="absolute flex items-center justify-center w-6 h-6 bg-brand-softer rounded-full -start-3 ring-8 ring-buffer">
                        <svg class="w-3 h-3 text-fg-brand-strong" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </span>
                    <time class="bg-neutral-secondary-medium border border-default-medium text-heading text-xs font-medium px-1.5 py-0.5 rounded">
                        {{ formatDate(sale.dateSold) }}
                    </time>
                    <h3 class="flex items-center mb-1 text-lg font-semibold text-heading my-2">
                        {{ t('sold_items.sold_label', { item: sale.inventory.item.name, variant: sale.inventory.varient.name }) }}
                        <span class="ms-2 bg-brand-softer border border-brand-subtle text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded">
                            {{ sale.quantity }} {{ t('common.units') }}
                        </span>
                    </h3>
                    <div class="mb-4 text-sm text-body space-y-1">
                        <p>{{ t('sold_items.units_sold_at', { qty: sale.quantity, unit: sale.inventory.varient.unit, price: sale.sellingPrice }) }}</p>
                        <div class="flex items-center gap-4 text-xs font-medium">
                            <span class="text-heading">{{ t('sold_items.total_revenue_label') }} <span class="font-bold text-fg-brand-strong">{{ sale.totalRevenue }} {{ t('common.br') }}</span></span>
                            <span class="text-fg-success font-semibold">{{ t('sold_items.margin_label') }} +{{ sale.margin }} {{ t('common.br') }}</span>
                        </div>
                    </div>
                </li>
            </ol>
            <div v-else class="text-center py-10 text-body">{{ t('sold_items.no_records_item') }}</div>
        </div>

        <!-- All items: Table -->
        <div v-else class="relative w-full max-w-full overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <table class="w-full text-sm text-left rtl:text-right text-body">
                <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_item_name') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('sold_items.col_variant') }}</th>
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
                        <td class="px-6 py-4">{{ sale.inventory.varient.name }}</td>
                        <td class="px-6 py-4 font-semibold">{{ sale.quantity }}</td>
                        <td class="px-6 py-4">{{ sale.sellingPrice }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 font-bold text-heading">{{ sale.totalRevenue }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 font-medium text-fg-success">+{{ sale.margin }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 text-xs text-body">{{ formatDate(sale.dateSold) }}</td>
                    </tr>
                    <tr v-if="filteredSales.length === 0">
                        <td colspan="7" class="px-6 py-8 text-center text-body">{{ t('sold_items.no_records_recent') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
