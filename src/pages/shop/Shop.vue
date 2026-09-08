<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { initModals, initTooltips } from 'flowbite';
import type { Item } from '@/types/items.type';
import type { Inventory } from '@/types/inventory.type';
import type { Shop } from '@/types/shop.type';
import { db, seedDatabase, toRawPlain } from '@/database';

const { t } = useI18n();
const route = useRoute();

const items = ref<Item[]>([]);
const inventory = ref<Inventory[]>([]);
const searchQuery = ref('');
const selectedInventoryItem = ref<Inventory | null>(null);

const selectedItemForSell = ref<Item | null>(null);
const sellQuantity = ref<number | null>(1);
const sellDiscount = ref<number | null>(0);
const discountInputLock = ref<boolean>(true);
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

const targetInventoryItem = computed(() => {
    if (!selectedItemForSell.value) return null;
    return inventory.value.find(inv =>
        inv.item.id === selectedItemForSell.value?.id
    ) || null;
});

const filteredInventory = computed(() => {
    if (!searchQuery.value.trim()) return inventory.value;
    const q = searchQuery.value.toLowerCase().trim();
    return inventory.value.filter(inv =>
        inv.item.name.toLowerCase().includes(q) ||
        inv.item.unit.toLowerCase().includes(q)
    );
});

const toggleSelectInventoryItem = (inv: Inventory) => {
    selectedInventoryItem.value = selectedInventoryItem.value?.id === inv.id ? null : inv;
};

const openSellModal = (inv?: Inventory) => {
    sellErrorMessage.value = '';
    sellSuccessMessage.value = '';
    sellQuantity.value = 1;

    if (inv) {
        const foundItem = items.value.find(i => i.id === inv.item.id);
        if (foundItem) {
            selectedItemForSell.value = foundItem;
        }
    } else if (selectedInventoryItem.value) {
        const foundItem = items.value.find(i => i.id === selectedInventoryItem.value?.item.id);
        if (foundItem) {
            selectedItemForSell.value = foundItem;
        }
    } else if (items.value.length > 0) {
        selectedItemForSell.value = items.value[0];
    }
};

const handleDiscountLock = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    discountInputLock.value = !discountInputLock.value;
}

const handleSellSubmit = async () => {
    sellErrorMessage.value = '';
    sellSuccessMessage.value = '';

    if (!selectedItemForSell.value) {
        sellErrorMessage.value = t('inventory.err_select_item');
        return;
    }
    if (!targetInventoryItem.value) {
        sellErrorMessage.value = t('inventory.err_item_not_found');
        return;
    }
    if (!sellQuantity.value || sellQuantity.value <= 0) {
        sellErrorMessage.value = t('inventory.err_quantity');
        return;
    }

    const qty = Number(sellQuantity.value);
    if (qty > targetInventoryItem.value.quantity) {
        sellErrorMessage.value = `Cannot sell ${qty} units. Only ${targetInventoryItem.value.quantity} units available in stock!`;
        return;
    }

    const dis = Number(sellDiscount.value);
    // if (qty > targetInventoryItem.value.quantity) {
    //     sellErrorMessage.value = `Cannot sell ${qty} units. Only ${targetInventoryItem.value.quantity} units available in stock!`;
    //     return;
    // }

    const targetInv = targetInventoryItem.value;
    const acqP = targetInv.acquiredPrice || 0;
    const sellP = targetInv.sellingPrice || 0;
    const totalRev = qty * sellP + dis;
    const totalCst = qty * acqP;
    const totalMargin = totalRev - totalCst;

    const nextQuantity = targetInv.quantity - qty;
    const nextRunOutDate = nextQuantity === 0 ? new Date() : targetInv.runOutDate;
    await db.inventory.update(targetInv.id, {
        quantity: nextQuantity,
        runOutDate: nextRunOutDate,
    });
    targetInv.quantity = nextQuantity;
    targetInv.runOutDate = nextRunOutDate;
    // await db.changes.add(toRawPlain({
    //     happenedAt: new Date(),
    //     data: targetInv,
    //     entity: 'inventory',
    //     action: 'update',
    //     isSynced: false
    // }));

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
    // await db.changes.add(toRawPlain({
    //     happenedAt: new Date(),
    //     data: saleLog,
    //     entity: 'sales',
    //     action: 'create',
    //     isSynced: false
    // }));

    sellSuccessMessage.value = t('shop.sell_success', {
        qty,
        item: targetInv.item.name,
        total: totalRev
    });

    sellQuantity.value = 1;
    sellDiscount.value = 0;

    await loadData();
    hideModal('sell-modal');
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
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900 dark:text-primary-500">{{ t('shop.title') }}</h2>

        <div class="p-4">
            <label for="input-group-1" class="sr-only">{{ t('common.search') }}</label>
            <div class="relative">
                <div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                        height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                            d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input type="text" id="input-group-1" v-model="searchQuery"
                    class="block max-w-96 ps-9 pe-3 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
                    :placeholder="t('shop.search_placeholder')">
            </div>
        </div>

        <div class="flex items-center justify-center w-full mb-4">
            <button data-tooltip-target="tooltip-sell"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="sell-modal" data-modal-toggle="sell-modal" @click="openSellModal()">
                <v-icon name="md-shoppingcart-round" scale="1"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('shop.sell') }}</span>
            </button>
            <div id="tooltip-sell" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('shop.sell_item') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <router-link :to="selectedInventoryItem ? `/shop/sold/${selectedInventoryItem.id}` : '/shop/sold'"
                data-tooltip-target="tooltip-sold"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-receiptlong-round" scale="1"
                    :class="route.path.startsWith('/shop/sold') ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('shop.sold_history') }}</span>
            </router-link>
            <div id="tooltip-sold" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('shop.sold_history') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
        </div>

        <!-- Sell Modal -->
        <div id="sell-modal" tabindex="-1" aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">{{ t('shop.sell_item') }}</h3>
                        <button type="button"
                            class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="sell-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                                height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">{{ t('common.close') }}</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleSellSubmit">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2">
                                <label for="sell-item-select" class="block mb-2.5 text-sm font-medium text-heading">{{
                                    t('shop.select_item') }}</label>
                                <select id="sell-item-select" v-model="selectedItemForSell"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs"
                                    required>
                                    <option :value="null" disabled selected>{{ t('shop.select_item_placeholder') }}
                                    </option>
                                    <option v-for="item in items" :key="item.id" :value="item">{{ item.name }}</option>
                                </select>
                            </div>

                            <div
                                class="col-span-2 bg-neutral-secondary-medium border border-default p-3 rounded-base text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-body font-medium">{{ t('shop.available_stock') }}</span>
                                    <span
                                        :class="targetInventoryItem && targetInventoryItem.quantity > 0 ? 'text-heading font-bold' : 'text-danger font-bold'">
                                        {{ targetInventoryItem ? `${targetInventoryItem.quantity} ${t('common.units')}`
                                            : t('shop.out_of_stock') }}
                                    </span>
                                </div>
                                <div class="flex justify-between" v-if="targetInventoryItem">
                                    <span class="text-body font-medium">{{ t('shop.selling_price_label') }}</span>
                                    <span class="text-heading font-bold">{{ targetInventoryItem.sellingPrice }} {{
                                        t('shop.selling_price_unit') }}</span>
                                </div>
                            </div>
                            <div class="col-span-2 grid grid-cols-3 gap-2">
                                <div class="col-span-2">
                                    <label for="sell-quantity" class="block mb-2.5 text-sm font-medium text-heading">{{
                                        t('shop.quantity_to_sell') }}</label>
                                    <input type="number" :min="0" step="0.001"
                                        :max="targetInventoryItem?.quantity || 9999" id="sell-quantity"
                                        v-model="sellQuantity"
                                        class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                        :placeholder="t('shop.quantity_placeholder')" required>
                                </div>
                                <div class="col-span-1">
                                    <label for="sell-discount-increment"
                                        class="block mb-2.5 text-sm font-medium text-heading">{{
                                            t('shop.sell_discount_increment') }}</label>
                                    <div class="relative">
                                        <button
                                            type="button"
                                            class="absolute inset-y-0 inset-e-0 flex items-center pe-3 cursor-pointer focus:ring-0!"
                                            @click="handleDiscountLock">
                                            <v-icon v-if="discountInputLock" name="md-lock-round"  class="w-4 h-4 text-body" />
                                            <v-icon v-else name="md-lockopen-round"  class="w-4 h-4 text-body" />
                                        </button>
                                        <input type="number"
                                            :disabled="discountInputLock"
                                            :min="(-1 * (sellQuantity || 0) * (targetInventoryItem?.sellingPrice || 0)) || -9999"
                                            :max="9999" id="sell-discount-increment" v-model="sellDiscount"
                                            class="block max-w-96 pe-9 ps-3 w-full bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            :placeholder="t('shop.sell_discount_increment_placeholder')" required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-span-2" v-if="targetInventoryItem && sellQuantity">
                                <div
                                    class="flex justify-between items-center p-3 bg-brand-softer border border-brand-subtle rounded-base text-sm font-medium text-fg-brand-strong">
                                    <span>{{ t('shop.total_amount') }}</span>
                                    <span class="text-base font-bold">{{ ((sellQuantity || 0) *
                                        (targetInventoryItem.sellingPrice || 0) + (sellDiscount || 0)) }} {{
                                            t('common.br') }}</span>
                                </div>
                            </div>
                            <div class="col-span-2" v-if="sellErrorMessage">
                                <div
                                    class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ sellErrorMessage }}</div>
                            </div>
                            <div class="col-span-2" v-if="sellSuccessMessage">
                                <div
                                    class="p-3 bg-success-softer border border-success-subtle rounded-base text-xs font-semibold text-fg-success">
                                    ✓ {{ sellSuccessMessage }}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('shop.confirm_sale') }}
                            </button>
                            <button data-modal-hide="sell-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.close') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Inventory Table -->
        <div
            class="relative w-full max-w-full overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
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
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('shop.col_name') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('shop.col_unit') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('shop.col_stock') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('shop.col_price') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium text-right"><span class="sr-only">{{
                            t('common.actions') }}</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="inventoryItem in filteredInventory" :key="inventoryItem.id"
                        :class="{ 'bg-neutral-secondary-medium': selectedInventoryItem?.id === inventoryItem.id }"
                        class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium cursor-pointer"
                        @click="toggleSelectInventoryItem(inventoryItem)">
                        <td class="w-4 p-4" @click.stop>
                            <div class="flex items-center">
                                <input :id="'table-checkbox-' + inventoryItem.id" type="checkbox"
                                    :checked="selectedInventoryItem?.id === inventoryItem.id"
                                    @change="toggleSelectInventoryItem(inventoryItem)"
                                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label :for="'table-checkbox-' + inventoryItem.id" class="sr-only">Table
                                    checkbox</label>
                            </div>
                        </td>
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">{{
                            inventoryItem.item.name }}</th>
                        <td class="px-6 py-4">{{ inventoryItem.item.unit }}</td>
                        <td class="px-6 py-4 font-semibold"
                            :class="{ 'text-danger': inventoryItem.quantity <= inventoryItem.runOutThreshhold }">{{
                                inventoryItem.quantity }}</td>
                        <td class="px-6 py-4 font-medium text-heading">{{ inventoryItem.sellingPrice || 0 }} {{
                            t('common.br') }}</td>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <button data-modal-target="sell-modal" data-modal-toggle="sell-modal"
                                @click="openSellModal(inventoryItem)"
                                class="font-medium text-fg-brand hover:underline">{{ t('shop.sell') }}</button>
                        </td>
                    </tr>
                    <tr v-if="filteredInventory.length === 0">
                        <td colspan="6" class="px-6 py-8 text-center text-body">{{ t('shop.no_products') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
