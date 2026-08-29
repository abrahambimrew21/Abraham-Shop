<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Inventory, Restock } from '@/types/inventory.type';
import { db, seedDatabase } from '@/database';

const route = useRoute();
const inventoryId = computed(() => route.params.id as string | undefined);

const searchQuery = ref('');
const restockHistory = ref<Restock[]>([]);
const targetInventory = ref<Inventory | null>(null);

const loadHistory = async () => {
    await seedDatabase();
    restockHistory.value = await db.restockHistory.toArray();

    if (inventoryId.value) {
        const found = await db.inventory.get(inventoryId.value);
        targetInventory.value = found || null;
    } else {
        targetInventory.value = null;
    }
};

onMounted(async () => {
    await loadHistory();
});

watch(inventoryId, async () => {
    await loadHistory();
});

const filteredHistory = computed(() => {
    let logs = restockHistory.value;

    if (inventoryId.value) {
        logs = logs.filter(r => r.inventory?.id === inventoryId.value || r.inventory?.item?.id === inventoryId.value);
    }

    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim();
        logs = logs.filter(r =>
            r.inventory?.item?.name?.toLowerCase().includes(q) ||
            r.inventory?.varient?.name?.toLowerCase().includes(q)
        );
    }

    return logs.sort((a, b) => new Date(b.restockDate).getTime() - new Date(a.restockDate).getTime());
});

const formatDate = (dateInput: Date | string) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <div class="flex items-center gap-2">
            <router-link to="/inventory" class="text-body hover:text-heading flex items-center me-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </router-link>
            <h2 class="text-xl font-medium text-primary-900">
                {{ targetInventory ? `${targetInventory.item.name} (${targetInventory.varient.name}) History` : 'Restock History' }}
            </h2>
        </div>

        <div class="p-4">
            <label for="input-group-1" class="sr-only">Search</label>
            <div class="relative max-w-96 w-full">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                        height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                            d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input type="text" id="input-group-1" v-model="searchQuery"
                    class="block w-full min-w-96 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
                    placeholder="Search history...">
            </div>
        </div>

        <div class="w-full px-4 md:px-20">
            <ol v-if="filteredHistory.length > 0" class="relative border-s border-default w-full">
                <li v-for="log in filteredHistory" :key="log.id" class="mb-10 ms-6">
                    <span
                        class="absolute flex items-center justify-center w-6 h-6 bg-brand-softer rounded-full -start-3 ring-8 ring-buffer">
                        <svg class="w-3 h-3 text-fg-brand-strong" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                            width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z" />
                        </svg>
                    </span>
                    <time
                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-xs font-medium px-1.5 py-0.5 rounded">
                        {{ formatDate(log.restockDate) }}
                    </time>
                    <h3 class="flex items-center mb-1 text-lg font-semibold text-heading my-2">
                        Restocked {{ log.inventory.item.name }} ({{ log.inventory.varient.name }})
                        <span
                            class="ms-2 bg-brand-softer border border-brand-subtle text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded">
                            +{{ log.quantity }} {{ log.inventory.varient.unit }}
                        </span>
                    </h3>
                    <div class="mb-4 text-sm text-body space-y-1">
                        <p>{{ log.quantity }} {{ log.inventory.varient.unit }} restocked</p>
                        <div class="flex items-center gap-4 text-xs font-medium">
                            <span class="text-heading">Cost Price: <span class="font-normal">{{ log.acquiredPrice || 0 }} ETB/unit</span></span>
                            <span class="text-heading">Selling Price: <span class="font-normal">{{ log.sellingPrice || log.inventory.varient.unitPrice || 0 }} ETB/unit</span></span>
                            <span class="text-fg-success font-semibold">Margin: +{{ (log.sellingPrice || 0) - (log.acquiredPrice || 0) }} ETB/unit</span>
                        </div>
                    </div>
                </li>
            </ol>
            <div v-else class="text-center py-10 text-body">
                No restock history records found.
            </div>
        </div>
    </div>
</template>
