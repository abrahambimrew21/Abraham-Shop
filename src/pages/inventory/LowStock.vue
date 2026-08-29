<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { initModals, initTooltips } from 'flowbite';
import type { Inventory, Restock } from '@/types/inventory.type';
import { db, seedDatabase, toRawPlain } from '@/database';

const route = useRoute();

const inventory = ref<Inventory[]>([]);
const searchQuery = ref('');
const selectedInventoryItem = ref<Inventory | null>(null);

// Form state for Restock Modal
const restockItem = ref<Inventory | null>(null);
const restockQuantity = ref<number | null>(null);
const restockAcquiredPrice = ref<number | null>(null);
const restockSellingPrice = ref<number | null>(null);
const restockErrorMessage = ref<string>('');

const loadData = async () => {
    await seedDatabase();
    inventory.value = await db.inventory.toArray();
};

onMounted(async () => {
    await loadData();
    initModals();
    initTooltips();
});

const lowStockItems = computed(() => {
    return inventory.value.filter(inv => inv.quantity <= inv.runOutThreshhold);
});

const filteredLowStock = computed(() => {
    if (!searchQuery.value.trim()) return lowStockItems.value;
    const q = searchQuery.value.toLowerCase().trim();
    return lowStockItems.value.filter(inv =>
        inv.item.name.toLowerCase().includes(q) ||
        inv.varient.name.toLowerCase().includes(q)
    );
});

const toggleSelectInventoryItem = (inv: Inventory) => {
    if (selectedInventoryItem.value?.id === inv.id) {
        selectedInventoryItem.value = null;
    } else {
        selectedInventoryItem.value = inv;
    }
};

const openRestockModal = (inv: Inventory) => {
    restockErrorMessage.value = '';
    restockItem.value = inv;
    restockQuantity.value = null;
    restockAcquiredPrice.value = inv.acquiredPrice || null;
    restockSellingPrice.value = inv.sellingPrice || null;
};

const handleRestockSubmit = async () => {
    restockErrorMessage.value = '';

    if (!restockItem.value) return;

    if (!restockQuantity.value || restockQuantity.value <= 0) {
        restockErrorMessage.value = 'Please enter a valid restock quantity greater than 0.';
        return;
    }

    if (restockAcquiredPrice.value === null || restockAcquiredPrice.value < 0) {
        restockErrorMessage.value = 'Please enter a valid cost (acquired price).';
        return;
    }

    if (restockSellingPrice.value === null || restockSellingPrice.value < 0) {
        restockErrorMessage.value = 'Please enter a valid selling price.';
        return;
    }

    const acquiredP = Number(restockAcquiredPrice.value);
    const sellingP = Number(restockSellingPrice.value);

    restockItem.value.quantity += Number(restockQuantity.value);
    restockItem.value.acquiredPrice = acquiredP;
    restockItem.value.sellingPrice = sellingP;
    restockItem.value.stockedDate = new Date();
    await db.inventory.put(toRawPlain(restockItem.value));

    // Save restock event to history
    const restockLog: Restock = {
        id: Date.now().toString(),
        inventory: restockItem.value,
        quantity: Number(restockQuantity.value),
        acquiredPrice: acquiredP,
        sellingPrice: sellingP,
        restockDate: new Date()
    };
    await db.restockHistory.add(toRawPlain(restockLog));

    restockItem.value = null;
    restockQuantity.value = null;
    restockAcquiredPrice.value = null;
    restockSellingPrice.value = null;
    restockErrorMessage.value = '';

    await loadData();
};
</script>

<template>
    <div class="flex flex-col gap-4 w-full items-center pb-20">
        <!-- Header -->
        <div class="flex items-center gap-2">
            <router-link to="/inventory" class="text-body hover:text-heading flex items-center me-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </router-link>
            <h2 class="text-xl font-medium text-danger-strong flex items-center gap-2">
                ⚠️ Low Stock Alert (Below Threshold)
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
                    placeholder="Search low stock items...">
            </div>
        </div>

        <!-- Restock Inventory Modal -->
        <div id="restock-inventory-modal" tabindex="-1" aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">
                            Restock product
                        </h3>
                        <button type="button"
                            class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="restock-inventory-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                                height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleRestockSubmit">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block mb-2.5 text-sm font-medium text-heading">Item</label>
                                <select disabled
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    <option selected>{{ restockItem?.item.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block mb-2.5 text-sm font-medium text-heading">Varient</label>
                                <select disabled
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    <option selected>{{ restockItem?.varient.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-2">
                                <label for="restock-quantity"
                                    class="block mb-2.5 text-sm font-medium text-heading">Restock Quantity</label>
                                <input type="number" min="1" id="restock-quantity" v-model="restockQuantity"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="Enter quantity to add" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="restock-acquired-price"
                                    class="block mb-2.5 text-sm font-medium text-heading">Acquired Price (Cost/Unit)</label>
                                <input type="number" step="any" min="0" id="restock-acquired-price" v-model="restockAcquiredPrice"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="e.g. 150" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="restock-selling-price"
                                    class="block mb-2.5 text-sm font-medium text-heading">Selling Price (Market/Unit)</label>
                                <input type="number" step="any" min="0" id="restock-selling-price" v-model="restockSellingPrice"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="e.g. 200" required>
                            </div>

                            <div class="col-span-2" v-if="restockErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ restockErrorMessage }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                Restock
                            </button>
                            <button data-modal-hide="restock-inventory-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Low Stock Table -->
        <div class="relative w-full max-w-5xl overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-danger-subtle">
            <table class="w-full text-sm text-left rtl:text-right text-body">
                <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" class="px-6 py-3 font-medium">Name</th>
                        <th scope="col" class="px-6 py-3 font-medium">Varient</th>
                        <th scope="col" class="px-6 py-3 font-medium">Current Stock</th>
                        <th scope="col" class="px-6 py-3 font-medium">Threshold</th>
                        <th scope="col" class="px-6 py-3 font-medium">Status</th>
                        <th scope="col" class="px-6 py-3 font-medium text-right">
                            <span class="sr-only">Restock</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="inventoryItem in filteredLowStock" :key="inventoryItem.id"
                        class="bg-danger-softer/20 border-b border-default hover:bg-danger-softer/40 cursor-pointer">
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                            {{ inventoryItem.item.name }}
                        </th>
                        <td class="px-6 py-4">
                            {{ inventoryItem.varient.name }}
                        </td>
                        <td class="px-6 py-4 font-bold text-danger-strong">
                            {{ inventoryItem.quantity }}
                        </td>
                        <td class="px-6 py-4 text-body font-medium">
                            {{ inventoryItem.runOutThreshhold }}
                        </td>
                        <td class="px-6 py-4">
                            <span class="bg-danger-softer text-danger-strong border border-danger-subtle text-xs px-2.5 py-0.5 rounded-full font-bold">
                                Low Stock
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <button data-modal-target="restock-inventory-modal" data-modal-toggle="restock-inventory-modal"
                                @click="openRestockModal(inventoryItem)"
                                class="font-medium text-fg-brand hover:underline">Restock</button>
                        </td>
                    </tr>
                    <tr v-if="filteredLowStock.length === 0">
                        <td colspan="6" class="px-6 py-8 text-center text-fg-success font-medium">
                            ✓ Great news! No items are currently below their threshold stock limit.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
