<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { initModals, initTooltips } from 'flowbite';
import type { Item } from '@/types/items.type';
import type { Inventory } from '@/types/inventory.type';
import type { Shop } from '@/types/shop.type';
import { db, seedDatabase, toRawPlain } from '@/database';

const route = useRoute();

const items = ref<Item[]>([]);
const inventory = ref<Inventory[]>([]);
const searchQuery = ref('');

const selectedInventoryItem = ref<Inventory | null>(null);

// Sell Modal Form State
const selectedItemForSell = ref<Item | null>(null);
const selectedVarientIdForSell = ref<string>('');
const sellQuantity = ref<number | null>(1);
const sellErrorMessage = ref<string>('');
const sellSuccessMessage = ref<string>('');

const loadData = async () => {
    await seedDatabase();
    items.value = await db.items.toArray();
    inventory.value = await db.inventory.toArray();
};

onMounted(async () => {
    await loadData();
    initModals();
    initTooltips();
});

// Automatically resolve target inventory item based on selected Item & Variant
const targetInventoryItem = computed(() => {
    if (!selectedItemForSell.value || !selectedVarientIdForSell.value) return null;
    return inventory.value.find(inv =>
        inv.item.id === selectedItemForSell.value?.id &&
        inv.varient.id === selectedVarientIdForSell.value
    ) || null;
});

// Update selected variant options when item changes
watch(selectedItemForSell, (newItem) => {
    sellErrorMessage.value = '';
    if (newItem && newItem.varient && newItem.varient.length > 0) {
        selectedVarientIdForSell.value = newItem.varient[0].id;
    } else {
        selectedVarientIdForSell.value = '';
    }
});

const filteredInventory = computed(() => {
    if (!searchQuery.value.trim()) return inventory.value;
    const q = searchQuery.value.toLowerCase().trim();
    return inventory.value.filter(inv =>
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

const openSellModal = (inv?: Inventory) => {
    sellErrorMessage.value = '';
    sellSuccessMessage.value = '';
    sellQuantity.value = 1;

    if (inv) {
        const foundItem = items.value.find(i => i.id === inv.item.id);
        if (foundItem) {
            selectedItemForSell.value = foundItem;
            selectedVarientIdForSell.value = inv.varient.id;
        }
    } else if (selectedInventoryItem.value) {
        const foundItem = items.value.find(i => i.id === selectedInventoryItem.value?.item.id);
        if (foundItem) {
            selectedItemForSell.value = foundItem;
            selectedVarientIdForSell.value = selectedInventoryItem.value.varient.id;
        }
    } else if (items.value.length > 0) {
        selectedItemForSell.value = items.value[0];
        if (items.value[0].varient?.length > 0) {
            selectedVarientIdForSell.value = items.value[0].varient[0].id;
        }
    }
};

const handleSellSubmit = async () => {
    sellErrorMessage.value = '';
    sellSuccessMessage.value = '';

    if (!selectedItemForSell.value || !selectedVarientIdForSell.value) {
        sellErrorMessage.value = 'Please select both an item and a varient.';
        return;
    }

    if (!targetInventoryItem.value) {
        sellErrorMessage.value = 'This item varient is out of stock or has not been added to inventory.';
        return;
    }

    if (!sellQuantity.value || sellQuantity.value <= 0) {
        sellErrorMessage.value = 'Please enter a valid quantity greater than 0.';
        return;
    }

    const qty = Number(sellQuantity.value);

    if (qty > targetInventoryItem.value.quantity) {
        sellErrorMessage.value = `Cannot sell ${qty} units. Only ${targetInventoryItem.value.quantity} units available in stock!`;
        return;
    }

    const targetInv = targetInventoryItem.value;
    const acqP = targetInv.acquiredPrice || 0;
    const sellP = targetInv.sellingPrice || 0;

    const totalRev = qty * sellP;
    const totalCst = qty * acqP;
    const totalMargin = totalRev - totalCst;

    // Decrement stock
    targetInv.quantity -= qty;
    if (targetInv.quantity === 0) {
        targetInv.runOutDate = new Date();
    }
    await db.inventory.put(toRawPlain(targetInv));

    // Create Sale record
    const saleLog: Shop = {
        id: Date.now().toString(),
        inventory: targetInv,
        quantity: qty,
        acquiredPrice: acqP,
        sellingPrice: sellP,
        totalRevenue: totalRev,
        totalCost: totalCst,
        margin: totalMargin,
        dateSold: new Date()
    };

    await db.sales.add(toRawPlain(saleLog));

    sellSuccessMessage.value = `Successfully sold ${qty} units of ${targetInv.item.name} (${targetInv.varient.name}) for ${totalRev} Br!`;
    sellQuantity.value = 1;

    await loadData();
};
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900">Shop</h2>

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
                    placeholder="Search shop products...">
            </div>
        </div>

        <div class="flex items-center justify-center w-full mb-4">
            <!-- Sell Button -->
            <button data-tooltip-target="tooltip-sell"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="sell-modal" data-modal-toggle="sell-modal" @click="openSellModal()">
                <v-icon name="md-shoppingcart-round" scale="1"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Sell</span>
            </button>
            <div id="tooltip-sell" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Sell Item
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Sold History Link Button -->
            <router-link :to="selectedInventoryItem ? `/shop/sold/${selectedInventoryItem.id}` : '/shop/sold'"
                data-tooltip-target="tooltip-sold"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-receiptlong-round" scale="1"
                    :class="route.path.startsWith('/shop/sold') ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Sold</span>
            </router-link>
            <div id="tooltip-sold" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Sold Items History
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
        </div>

        <!-- Sell Modal -->
        <div id="sell-modal" tabindex="-1" aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">
                            Sell Item
                        </h3>
                        <button type="button"
                            class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="sell-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                                height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>

                    <form @submit.prevent="handleSellSubmit">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <!-- Item Dropdown -->
                            <div class="col-span-2 sm:col-span-1">
                                <label for="sell-item-select"
                                    class="block mb-2.5 text-sm font-medium text-heading">Select Item</label>
                                <select id="sell-item-select" v-model="selectedItemForSell"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs"
                                    required>
                                    <option :value="null" disabled selected>Select item</option>
                                    <option v-for="item in items" :key="item.id" :value="item">
                                        {{ item.name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Varient Dropdown -->
                            <div class="col-span-2 sm:col-span-1">
                                <label for="sell-varient-select"
                                    class="block mb-2.5 text-sm font-medium text-heading">Select Varient</label>
                                <select id="sell-varient-select" v-model="selectedVarientIdForSell"
                                    :disabled="!selectedItemForSell"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    required>
                                    <option value="" disabled selected>Select varient</option>
                                    <option v-for="varient in selectedItemForSell?.varient" :key="varient.id" :value="varient.id">
                                        {{ varient.name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Stock & Price Status Indicator -->
                            <div class="col-span-2 bg-neutral-secondary-medium border border-default p-3 rounded-base text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-body font-medium">Available Stock:</span>
                                    <span :class="targetInventoryItem && targetInventoryItem.quantity > 0 ? 'text-heading font-bold' : 'text-danger font-bold'">
                                        {{ targetInventoryItem ? `${targetInventoryItem.quantity} units` : 'Out of Stock' }}
                                    </span>
                                </div>
                                <div class="flex justify-between" v-if="targetInventoryItem">
                                    <span class="text-body font-medium">Selling Price:</span>
                                    <span class="text-heading font-bold">{{ targetInventoryItem.sellingPrice }} Br/unit</span>
                                </div>
                            </div>

                            <!-- Quantity Input -->
                            <div class="col-span-2 sm:col-span-2">
                                <label for="sell-quantity"
                                    class="block mb-2.5 text-sm font-medium text-heading">Quantity to Sell</label>
                                <input type="number" min="1" :max="targetInventoryItem?.quantity || 9999" id="sell-quantity" v-model="sellQuantity"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="Enter quantity" required>
                            </div>

                            <!-- Total Price Calc -->
                            <div class="col-span-2" v-if="targetInventoryItem && sellQuantity">
                                <div class="flex justify-between items-center p-3 bg-brand-softer border border-brand-subtle rounded-base text-sm font-medium text-fg-brand-strong">
                                    <span>Total Amount:</span>
                                    <span class="text-base font-bold">{{ (sellQuantity || 0) * (targetInventoryItem.sellingPrice || 0) }} Br</span>
                                </div>
                            </div>

                            <!-- Validation Error Alert Banner -->
                            <div class="col-span-2" v-if="sellErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ sellErrorMessage }}
                                </div>
                            </div>

                            <!-- Success Banner -->
                            <div class="col-span-2" v-if="sellSuccessMessage">
                                <div class="p-3 bg-success-softer border border-success-subtle rounded-base text-xs font-semibold text-fg-success">
                                    ✓ {{ sellSuccessMessage }}
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                Confirm Sale
                            </button>
                            <button data-modal-hide="sell-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Close</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Inventory Table for Shop -->
        <div
            class="relative w-full overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <table class="w-full text-sm text-left rtl:text-right text-body">
                <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" class="p-4">
                            <div class="flex items-center">
                                <input id="table-checkbox-header" type="checkbox" value=""
                                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label for="table-checkbox-header" class="sr-only">Table checkbox</label>
                            </div>
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Name
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Varient
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Stock
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Price
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium text-right">
                            <span class="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inventoryItem) in filteredInventory" :key="inventoryItem.id"
                        :class="{ 'bg-neutral-secondary-medium': selectedInventoryItem?.id === inventoryItem.id }"
                        class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium cursor-pointer"
                        @click="toggleSelectInventoryItem(inventoryItem)">
                        <td class="w-4 p-4" @click.stop>
                            <div class="flex items-center">
                                <input :id="'table-checkbox-' + inventoryItem.id" type="checkbox"
                                    :checked="selectedInventoryItem?.id === inventoryItem.id"
                                    @change="toggleSelectInventoryItem(inventoryItem)"
                                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label :for="'table-checkbox-' + inventoryItem.id" class="sr-only">Table checkbox</label>
                            </div>
                        </td>
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                            {{ inventoryItem.item.name }}
                        </th>
                        <td class="px-6 py-4">
                            {{ inventoryItem.varient.name }}
                        </td>
                        <td class="px-6 py-4 font-semibold" :class="{ 'text-danger': inventoryItem.quantity <= inventoryItem.runOutThreshhold }">
                            {{ inventoryItem.quantity }}
                        </td>
                        <td class="px-6 py-4 font-medium text-heading">
                            {{ inventoryItem.sellingPrice || 0 }} Br
                        </td>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <button data-modal-target="sell-modal" data-modal-toggle="sell-modal"
                                @click="openSellModal(inventoryItem)"
                                class="font-medium text-fg-brand hover:underline">Sell</button>
                        </td>
                    </tr>
                    <tr v-if="filteredInventory.length === 0">
                        <td colspan="6" class="px-6 py-8 text-center text-body">
                            No shop products available.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
