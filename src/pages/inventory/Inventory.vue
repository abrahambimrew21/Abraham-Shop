<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { initModals, initTooltips } from 'flowbite';
import type { Item } from '@/types/items.type';
import type { Inventory, Restock } from '@/types/inventory.type';
import { db, seedDatabase, toRawPlain } from '@/database';

const route = useRoute();

const items = ref<Item[]>([]);
const inventory = ref<Inventory[]>([]);
const searchQuery = ref('');

const selectedInventoryItem = ref<Inventory | null>(null);

// Form state for Add Stock Modal
const selectedItemForAdd = ref<Item | null>(null);
const selectedVarientIdForAdd = ref<string>('');
const quantityForAdd = ref<number | null>(null);
const acquiredPriceForAdd = ref<number | null>(null);
const sellingPriceForAdd = ref<number | null>(null);
const addStockErrorMessage = ref<string>('');

// Form state for Restock Modal
const restockItem = ref<Inventory | null>(null);
const restockQuantity = ref<number | null>(null);
const restockAcquiredPrice = ref<number | null>(null);
const restockSellingPrice = ref<number | null>(null);
const restockErrorMessage = ref<string>('');

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

const filteredInventory = computed(() => {
    if (!searchQuery.value.trim()) return inventory.value;
    const q = searchQuery.value.toLowerCase().trim();
    return inventory.value.filter(inv =>
        inv.item.name.toLowerCase().includes(q) ||
        inv.varient.name.toLowerCase().includes(q)
    );
});

const lowStockCount = computed(() => {
    return inventory.value.filter(inv => inv.quantity <= inv.runOutThreshhold).length;
});

const toggleSelectInventoryItem = (inv: Inventory) => {
    if (selectedInventoryItem.value?.id === inv.id) {
        selectedInventoryItem.value = null;
    } else {
        selectedInventoryItem.value = inv;
    }
};

const handleAddStock = async () => {
    addStockErrorMessage.value = '';

    if (!selectedItemForAdd.value || !selectedVarientIdForAdd.value) {
        addStockErrorMessage.value = 'Please select both an item and a varient.';
        return;
    }

    if (!quantityForAdd.value || quantityForAdd.value <= 0) {
        addStockErrorMessage.value = 'Please enter a valid quantity greater than 0.';
        return;
    }

    if (acquiredPriceForAdd.value === null || acquiredPriceForAdd.value < 0) {
        addStockErrorMessage.value = 'Please enter a valid cost (acquired price).';
        return;
    }

    if (sellingPriceForAdd.value === null || sellingPriceForAdd.value < 0) {
        addStockErrorMessage.value = 'Please enter a valid selling price.';
        return;
    }

    const targetVarient = selectedItemForAdd.value.varient.find(v => v.id === selectedVarientIdForAdd.value);
    if (!targetVarient) {
        addStockErrorMessage.value = 'Selected varient was not found.';
        return;
    }

    const acquiredP = Number(acquiredPriceForAdd.value);
    const sellingP = Number(sellingPriceForAdd.value);

    // Check if an inventory entry for this item & variant already exists
    const existing = inventory.value.find(
        inv => inv.item.id === selectedItemForAdd.value?.id && inv.varient.id === targetVarient.id
    );

    if (existing) {
        existing.quantity += Number(quantityForAdd.value);
        existing.acquiredPrice = acquiredP;
        existing.sellingPrice = sellingP;
        existing.stockedDate = new Date();
        await db.inventory.put(toRawPlain(existing));
    } else {
        const newInv: Inventory = {
            id: Date.now().toString(),
            item: {
                id: selectedItemForAdd.value.id,
                name: selectedItemForAdd.value.name
            },
            varient: targetVarient,
            quantity: Number(quantityForAdd.value),
            acquiredPrice: acquiredP,
            sellingPrice: sellingP,
            stockedDate: new Date(),
            runOutDate: null,
            runOutThreshhold: 5
        };
        await db.inventory.add(toRawPlain(newInv));
    }

    selectedItemForAdd.value = null;
    selectedVarientIdForAdd.value = '';
    quantityForAdd.value = null;
    acquiredPriceForAdd.value = null;
    sellingPriceForAdd.value = null;
    addStockErrorMessage.value = '';

    await loadData();
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

const handleDeleteClick = (e: MouseEvent) => {
    if (!selectedInventoryItem.value) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
    }
};

const handleDeleteInventory = async () => {
    if (!selectedInventoryItem.value) return;

    await db.inventory.delete(selectedInventoryItem.value.id);
    selectedInventoryItem.value = null;

    await loadData();
};
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900">Inventory</h2>

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
                    placeholder="Search">
            </div>
        </div>

        <div class="flex items-center justify-center w-full mb-4">
            <!-- Restock History Button -->
            <router-link :to="selectedInventoryItem ? `/inventory/history/${selectedInventoryItem.id}` : '/inventory/history'" data-tooltip-target="tooltip-history"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-history-round" scale="1"
                    :class="route.path.startsWith('/inventory/history') ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">History</span>
            </router-link>
            <div id="tooltip-history" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                History
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Low Stock Route Button -->
            <router-link to="/inventory/low-stock" data-tooltip-target="tooltip-low-stock"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group relative">
                <v-icon name="md-warehouse-round" scale="1"
                    :class="route.path === '/inventory/low-stock' ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span v-if="lowStockCount > 0" class="absolute -top-1 right-3 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {{ lowStockCount }}
                </span>
                <span class="sr-only">Low Stock</span>
            </router-link>
            <div id="tooltip-low-stock" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Low Stock Items
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Add Stock Button -->
            <button data-tooltip-target="tooltip-add"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="add-inventory-modal" data-modal-toggle="add-inventory-modal">
                <v-icon name="md-add-round" scale="1"
                    :class="route.path === '/inventory/add' ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Add</span>
            </button>
            <div id="tooltip-add" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Add
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Delete Button -->
            <button data-tooltip-target="tooltip-delete"
                data-modal-target="delete-modal"
                data-modal-toggle="delete-modal"
                @click.capture="handleDeleteClick"
                :class="{ 'opacity-50 cursor-not-allowed': !selectedInventoryItem }"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-delete-round" scale="1"
                    :class="route.path === '/inventory/delete' ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Delete</span>
            </button>
            <div id="tooltip-delete" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Delete
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
        </div>

        <!-- Delete Modal -->
        <div id="delete-modal" tabindex="-1"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <button type="button"
                        class="absolute top-3 end-2.5 text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                        data-modal-hide="delete-modal">
                        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                            height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18 17.94 6M18 18 6.06 6" />
                        </svg>
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="p-4 md:p-5 text-center">
                        <svg class="mx-auto mb-4 text-fg-disabled w-12 h-12" aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <h3 class="mb-6 text-body">Are you sure you want to delete {{ selectedInventoryItem ? `${selectedInventoryItem.item.name} (${selectedInventoryItem.varient.name})` : 'this product' }} from your inventory?
                        </h3>
                        <div class="flex items-center space-x-4 justify-center">
                            <button data-modal-hide="delete-modal" type="button" @click="handleDeleteInventory"
                                class="text-white bg-danger box-border border border-transparent hover:bg-danger-strong focus:ring-4 focus:ring-danger-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                Yes, I'm sure
                            </button>
                            <button data-modal-hide="delete-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">No,
                                cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Inventory Modal -->
        <div id="add-inventory-modal" tabindex="-1" aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">
                            Create new product
                        </h3>
                        <button type="button"
                            class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="add-inventory-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                                height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleAddStock">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2 sm:col-span-1">
                                <label for="item-select"
                                    class="block mb-2.5 text-sm font-medium text-heading">Item</label>
                                <select id="item-select" v-model="selectedItemForAdd"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs"
                                    required>
                                    <option :value="null" disabled selected>Select item</option>
                                    <option v-for="item in items" :key="item.id" :value="item">{{ item.name }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="varient-select"
                                    class="block mb-2.5 text-sm font-medium text-heading">Varient</label>
                                <select id="varient-select" v-model="selectedVarientIdForAdd"
                                    :disabled="!selectedItemForAdd"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    required>
                                    <option value="" disabled selected>Select varient</option>
                                    <option v-for="varient in selectedItemForAdd?.varient" :key="varient.id"
                                        :value="varient.id">{{ varient.name }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-2">
                                <label for="quantity"
                                    class="block mb-2.5 text-sm font-medium text-heading">Quantity</label>
                                <input type="number" min="1" name="quantity" id="quantity" v-model="quantityForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="Enter quantity" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="acquired-price"
                                    class="block mb-2.5 text-sm font-medium text-heading">Acquired Price (Cost/Unit)</label>
                                <input type="number" step="any" min="0" id="acquired-price" v-model="acquiredPriceForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="e.g. 150" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="selling-price"
                                    class="block mb-2.5 text-sm font-medium text-heading">Selling Price (Market/Unit)</label>
                                <input type="number" step="any" min="0" id="selling-price" v-model="sellingPriceForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="e.g. 200" required>
                            </div>

                            <div class="col-span-2" v-if="addStockErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ addStockErrorMessage }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                <svg class="w-4 h-4 me-1.5 -ms-0.5" aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                    viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                        stroke-width="2" d="M5 12h14m-7 7V5" />
                                </svg>
                                Add Stock
                            </button>
                            <button data-modal-hide="add-inventory-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Cancel</button>
                        </div>
                    </form>
                </div>
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

        <!-- Inventory Table -->
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
                            Quantity
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Cost
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">
                            Price
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium text-right">
                            <span class="sr-only">Restock</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inventoryItem) in filteredInventory" :key="inventoryItem.id"
                        :class="{
                            'bg-neutral-secondary-medium': selectedInventoryItem?.id === inventoryItem.id,
                            'bg-danger-softer/30 border-danger-subtle': inventoryItem.quantity <= inventoryItem.runOutThreshhold && selectedInventoryItem?.id !== inventoryItem.id
                        }"
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
                        <td class="px-6 py-4 font-semibold" :class="{ 'text-danger-strong font-bold': inventoryItem.quantity <= inventoryItem.runOutThreshhold }">
                            {{ inventoryItem.quantity }}
                            <span v-if="inventoryItem.quantity <= inventoryItem.runOutThreshhold" class="ms-2 bg-danger-softer text-danger-strong border border-danger-subtle text-xs px-2 py-0.5 rounded-full font-bold">
                                Low Stock
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            {{ inventoryItem.acquiredPrice || 0 }} Br
                        </td>
                        <td class="px-6 py-4 font-medium text-heading">
                            {{ inventoryItem.sellingPrice || 0 }} Br
                        </td>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <button data-modal-target="restock-inventory-modal" data-modal-toggle="restock-inventory-modal"
                                @click="openRestockModal(inventoryItem)"
                                class="font-medium text-fg-brand hover:underline">Restock</button>
                        </td>
                    </tr>
                    <tr v-if="filteredInventory.length === 0">
                        <td colspan="7" class="px-6 py-8 text-center text-body">
                            No inventory items found.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
</template>