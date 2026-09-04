<script lang="ts" setup>
import KenatDateSelector from '@/components/KenatDateSelector.vue';
import { db, seedDatabase, toRawPlain } from '@/database';
import type { Inventory, Restock } from '@/types/inventory.type';
import type { Item } from '@/types/items.type';
import { initModals, initTooltips } from 'flowbite';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();

const items = ref<Item[]>([]);
const inventory = ref<Inventory[]>([]);
const searchQuery = ref('');
const selectedInventoryItem = ref<Inventory | null>(null);

// Add Stock form state
const selectedItemForAdd = ref<Item | null>(null);
const selectedVarientIdForAdd = ref<string>('');
const quantityForAdd = ref<number | null>(null);
const acquiredPriceForAdd = ref<number | null>(null);
const sellingPriceForAdd = ref<number | null>(null);
const addStockErrorMessage = ref<string>('');

// Restock form state
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
    selectedInventoryItem.value = selectedInventoryItem.value?.id === inv.id ? null : inv;
};

const handleAddStock = async () => {
    addStockErrorMessage.value = '';

    if (!selectedItemForAdd.value || !selectedVarientIdForAdd.value) {
        addStockErrorMessage.value = t('inventory.err_select_item_variant');
        return;
    }
    if (!quantityForAdd.value || quantityForAdd.value <= 0) {
        addStockErrorMessage.value = t('inventory.err_quantity');
        return;
    }
    if (acquiredPriceForAdd.value === null || acquiredPriceForAdd.value < 0) {
        addStockErrorMessage.value = t('inventory.err_acquired_price');
        return;
    }
    if (sellingPriceForAdd.value === null || sellingPriceForAdd.value < 0) {
        addStockErrorMessage.value = t('inventory.err_selling_price');
        return;
    }

    const targetVarient = selectedItemForAdd.value.varient.find(v => v.id === selectedVarientIdForAdd.value);
    if (!targetVarient) {
        addStockErrorMessage.value = t('inventory.err_variant_not_found');
        return;
    }

    const acquiredP = Number(acquiredPriceForAdd.value);
    const sellingP = Number(sellingPriceForAdd.value);

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
            item: { id: selectedItemForAdd.value.id, name: selectedItemForAdd.value.name },
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
    hideModal('add-inventory-modal');
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
        restockErrorMessage.value = t('inventory.err_quantity');
        return;
    }
    if (restockAcquiredPrice.value === null || restockAcquiredPrice.value < 0) {
        restockErrorMessage.value = t('inventory.err_acquired_price');
        return;
    }
    if (restockSellingPrice.value === null || restockSellingPrice.value < 0) {
        restockErrorMessage.value = t('inventory.err_selling_price');
        return;
    }

    const acquiredP = Number(restockAcquiredPrice.value);
    const sellingP = Number(restockSellingPrice.value);

    restockItem.value.quantity += Number(restockQuantity.value);
    restockItem.value.acquiredPrice = acquiredP;
    restockItem.value.sellingPrice = sellingP;
    restockItem.value.stockedDate = new Date();
    await db.inventory.put(toRawPlain(restockItem.value));

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
    hideModal('restock-inventory-modal');
};

const hideModal = (modalId: string) => {
    const el = document.getElementById(modalId);
    if (el) {
        const closeBtn = el.querySelector<HTMLButtonElement>('[data-modal-hide]');
        if (closeBtn) {
            closeBtn.click();
        }
    }
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

// Auto-select variant when item changes in Add Stock modal
watch(selectedItemForAdd, (newItem) => {
    addStockErrorMessage.value = '';
    if (newItem && newItem.varient && newItem.varient.length > 0) {
        selectedVarientIdForAdd.value = newItem.varient[0].id;
    } else {
        selectedVarientIdForAdd.value = '';
    }
});
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900 dark:text-primary-500">{{ t('inventory.title') }}</h2>

        <div class="p-4 flex gap-4">
            <label for="input-group-1" class="sr-only">{{ t('common.search') }}</label>
            <div class="relative">
                <div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input type="text" id="input-group-1" v-model="searchQuery"
                    class="block max-w-96 ps-9 pe-3  bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
                    :placeholder="t('inventory.search_placeholder')">
            </div>

            <KenatDateSelector v-on:selected-date=""/>
        </div>

        <div class="flex items-center justify-center w-full mb-4">
            <!-- Restock History -->
            <router-link :to="selectedInventoryItem ? `/inventory/history/${selectedInventoryItem.id}` : '/inventory/history'"
                data-tooltip-target="tooltip-history"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-history-round" scale="1"
                    :class="route.path.startsWith('/inventory/history') ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('inventory.history') }}</span>
            </router-link>
            <div id="tooltip-history" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('inventory.history') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Low Stock -->
            <router-link to="/inventory/low-stock" data-tooltip-target="tooltip-low-stock"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group relative">
                <v-icon name="md-warehouse-round" scale="1"
                    :class="route.path === '/inventory/low-stock' ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
                <span v-if="lowStockCount > 0" class="absolute -top-1 right-3 bg-danger text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                    {{ lowStockCount }}
                </span>
                <span class="sr-only">{{ t('inventory.low_stock') }}</span>
            </router-link>
            <div id="tooltip-low-stock" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('inventory.low_stock') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Add Stock -->
            <button data-tooltip-target="tooltip-add"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="add-inventory-modal" data-modal-toggle="add-inventory-modal">
                <v-icon name="md-add-round" scale="1" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('inventory.add_stock') }}</span>
            </button>
            <div id="tooltip-add" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('inventory.add_stock') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Delete -->
            <button data-tooltip-target="tooltip-delete"
                data-modal-target="delete-modal" data-modal-toggle="delete-modal"
                @click.capture="handleDeleteClick"
                :class="{ 'opacity-50 cursor-not-allowed': !selectedInventoryItem }"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-delete-round" scale="1" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('common.delete') }}</span>
            </button>
            <div id="tooltip-delete" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('common.delete') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
        </div>

        <!-- Delete Modal -->
        <div id="delete-modal" tabindex="-1" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <button type="button" class="absolute top-3 inset-e-2.5 text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="delete-modal">
                        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                        </svg>
                        <span class="sr-only">{{ t('common.close') }}</span>
                    </button>
                    <div class="p-4 md:p-5 text-center">
                        <svg class="mx-auto mb-4 text-fg-disabled w-12 h-12" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <h3 class="mb-6 text-body">
                            {{ t('inventory.delete_confirm', {
                                item: selectedInventoryItem
                                    ? `${selectedInventoryItem.item.name} (${selectedInventoryItem.varient.name})`
                                    : ''
                            }) }}
                        </h3>
                        <div class="flex items-center space-x-4 justify-center">
                            <button data-modal-hide="delete-modal" type="button" @click="handleDeleteInventory"
                                class="text-white bg-danger box-border border border-transparent hover:bg-danger-strong focus:ring-4 focus:ring-danger-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.yes_sure') }}
                            </button>
                            <button data-modal-hide="delete-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.no_cancel') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Inventory Modal -->
        <div id="add-inventory-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">{{ t('inventory.add_stock_modal_title') }}</h3>
                        <button type="button" class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="add-inventory-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">{{ t('common.close') }}</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleAddStock">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2 sm:col-span-1">
                                <label for="item-select" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.item_label') }}</label>
                                <select id="item-select" v-model="selectedItemForAdd"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs" required>
                                    <option :value="null" disabled selected>{{ t('shop.select_item_placeholder') }}</option>
                                    <option v-for="item in items" :key="item.id" :value="item">{{ item.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="varient-select" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.variant_label') }}</label>
                                <select id="varient-select" v-model="selectedVarientIdForAdd" :disabled="!selectedItemForAdd"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs disabled:opacity-50 disabled:cursor-not-allowed" required>
                                    <option value="" disabled selected>{{ t('shop.select_variant_placeholder') }}</option>
                                    <option v-for="varient in selectedItemForAdd?.varient" :key="varient.id" :value="varient.id">{{ varient.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label for="quantity" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.quantity_label') }}</label>
                                <input type="number" min="1" name="quantity" id="quantity" v-model="quantityForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.quantity_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="acquired-price" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.acquired_price_label') }}</label>
                                <input type="number" step="any" min="0" id="acquired-price" v-model="acquiredPriceForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.acquired_price_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="selling-price" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.selling_price_label') }}</label>
                                <input type="number" step="any" min="0" id="selling-price" v-model="sellingPriceForAdd"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.selling_price_placeholder')" required>
                            </div>
                            <div class="col-span-2" v-if="addStockErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">⚠️ {{ addStockErrorMessage }}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                <svg class="w-4 h-4 me-1.5 -ms-0.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
                                </svg>
                                {{ t('inventory.add_stock_btn') }}
                            </button>
                            <button data-modal-hide="add-inventory-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.cancel') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Restock Modal -->
        <div id="restock-inventory-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">{{ t('inventory.restock_modal_title') }}</h3>
                        <button type="button" class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="restock-inventory-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">{{ t('common.close') }}</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleRestockSubmit">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.item_label') }}</label>
                                <select disabled class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    <option selected>{{ restockItem?.item.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.variant_label') }}</label>
                                <select disabled class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                    <option selected>{{ restockItem?.varient.name }}</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label for="restock-quantity" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.restock_quantity_label') }}</label>
                                <input type="number" min="1" id="restock-quantity" v-model="restockQuantity"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.restock_quantity_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="restock-acquired-price" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.acquired_price_label') }}</label>
                                <input type="number" step="any" min="0" id="restock-acquired-price" v-model="restockAcquiredPrice"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.acquired_price_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="restock-selling-price" class="block mb-2.5 text-sm font-medium text-heading">{{ t('inventory.selling_price_label') }}</label>
                                <input type="number" step="any" min="0" id="restock-selling-price" v-model="restockSellingPrice"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('inventory.selling_price_placeholder')" required>
                            </div>
                            <div class="col-span-2" v-if="restockErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">⚠️ {{ restockErrorMessage }}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('inventory.restock_btn') }}
                            </button>
                            <button data-modal-hide="restock-inventory-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.cancel') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Inventory Table -->
        <div class="relative w-full max-w-full overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <table class="w-full text-sm text-left rtl:text-right text-body">
                <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" class="p-4">
                            <div class="flex items-center">
                                <input id="table-checkbox-header" type="checkbox" value="" class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label for="table-checkbox-header" class="sr-only">Table checkbox</label>
                            </div>
                        </th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('inventory.col_name') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('inventory.col_variant') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('inventory.quantity_label') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('inventory.acquired_price_label') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('inventory.col_price') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium text-right"><span class="sr-only">{{ t('inventory.restock_btn') }}</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="inventoryItem in filteredInventory" :key="inventoryItem.id"
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
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">{{ inventoryItem.item.name }}</th>
                        <td class="px-6 py-4">{{ inventoryItem.varient.name }}</td>
                        <td class="px-6 py-4 font-semibold" :class="{ 'text-danger-strong font-bold': inventoryItem.quantity <= inventoryItem.runOutThreshhold }">
                            {{ inventoryItem.quantity }}
                            <span v-if="inventoryItem.quantity <= inventoryItem.runOutThreshhold" class="ms-2 bg-danger-softer text-danger-strong border border-danger-subtle text-xs px-2 py-0.5 rounded-full font-bold">
                                {{ t('low_stock.status_badge') }}
                            </span>
                        </td>
                        <td class="px-6 py-4">{{ inventoryItem.acquiredPrice || 0 }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 font-medium text-heading">{{ inventoryItem.sellingPrice || 0 }} {{ t('common.br') }}</td>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <button data-modal-target="restock-inventory-modal" data-modal-toggle="restock-inventory-modal"
                                @click="openRestockModal(inventoryItem)"
                                class="font-medium text-fg-brand hover:underline">{{ t('inventory.restock_btn') }}</button>
                        </td>
                    </tr>
                    <tr v-if="filteredInventory.length === 0">
                        <td colspan="7" class="px-6 py-8 text-center text-body">{{ t('inventory.no_items') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
