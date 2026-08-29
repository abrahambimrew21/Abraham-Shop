<script lang="ts" setup>
import type { Item } from '@/types/items.type';
import { db, seedDatabase, toRawPlain } from '@/database';
import { initModals, initTooltips } from 'flowbite';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const items = ref<Item[]>([]);
const selectedItem = ref<Item | null>(null);
const searchQuery = ref('');
const newItemName = ref('');

const loadItems = async () => {
    await seedDatabase();
    items.value = await db.items.toArray();
};

onMounted(async () => {
    await loadItems();
    initModals();
    initTooltips();
});

const filteredItems = computed(() => {
    if (!searchQuery.value.trim()) return items.value;
    const q = searchQuery.value.toLowerCase().trim();
    return items.value.filter(item => item.name.toLowerCase().includes(q));
});

const toggleSelectItem = (item: Item) => {
    if (selectedItem.value?.id === item.id) {
        selectedItem.value = null;
    } else {
        selectedItem.value = item;
    }
};

const handleAddItem = async () => {
    if (!newItemName.value.trim()) return;
    const newItem: Item = {
        id: Date.now().toString(),
        name: newItemName.value.trim(),
        varient: []
    };
    await db.items.add(toRawPlain(newItem));
    newItemName.value = '';
    await loadItems();
};

const handleDeleteClick = (e: MouseEvent) => {
    if (!selectedItem.value) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
    }
};

const handleDeleteItem = async () => {
    if (!selectedItem.value) return;
    await db.items.delete(selectedItem.value.id);
    selectedItem.value = null;
    await loadItems();
};
</script>
<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900">Shop Items</h2>

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
            <button data-tooltip-target="tooltip-add"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="add-item-modal" data-modal-toggle="add-item-modal">
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
            <button data-tooltip-target="tooltip-update"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-edit-round" scale="1"
                    :class="route.path === '/inventory/update' ? 'text-fg-brand' : 'text-body'"
                    class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">Update</span>
            </button>
            <div id="tooltip-update" role="tooltip"
                class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                Update
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>
            <button data-tooltip-target="tooltip-delete"
                data-modal-target="delete-modal"
                data-modal-toggle="delete-modal"
                @click.capture="handleDeleteClick"
                :class="{ 'opacity-50 cursor-not-allowed': !selectedItem }"
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
                        <h3 class="mb-6 text-body">Are you sure you want to delete {{ selectedItem?.name || 'this item' }}?
                        </h3>
                        <div class="flex items-center space-x-4 justify-center">
                            <button data-modal-hide="delete-modal" type="button" @click="handleDeleteItem"
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

        <div id="add-item-modal" tabindex="-1" aria-hidden="true"
            class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <!-- Modal content -->
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <!-- Modal header -->
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">
                            Create new product
                        </h3>
                        <button type="button"
                            class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="add-item-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24"
                                height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>
                    <!-- Modal body -->
                    <form @submit.prevent="handleAddItem">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2">
                                <label for="item-name"
                                    class="block mb-2.5 text-sm font-medium text-heading">Item Name</label>
                                <input type="text" name="item-name" id="item-name" v-model="newItemName"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    placeholder="Enter item name" required>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit" data-modal-hide="add-item-modal"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                <svg class="w-4 h-4 me-1.5 -ms-0.5" aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                    viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                        stroke-width="2" d="M5 12h14m-7 7V5" />
                                </svg>
                                Create Item
                            </button>
                            <button data-modal-hide="add-item-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

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
                        <th scope="col" class="px-6 py-3 font-medium text-right">
                            <span class="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item) in filteredItems" :key="item.id"
                        :class="{ 'bg-neutral-secondary-medium': selectedItem?.id === item.id }"
                        class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium cursor-pointer"
                        @click="toggleSelectItem(item)">
                        <td class="w-4 p-4" @click.stop>
                            <div class="flex items-center">
                                <input :id="'table-checkbox-' + item.id" type="checkbox"
                                    :checked="selectedItem?.id === item.id"
                                    @change="toggleSelectItem(item)"
                                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label :for="'table-checkbox-' + item.id" class="sr-only">Table checkbox</label>
                            </div>
                        </td>
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                            {{ item.name }}
                        </th>
                        <td class="px-6 py-4 text-right" @click.stop>
                            <router-link :to="`/setting/shop-items/${item.id}/varients`"
                                class="font-medium text-fg-brand hover:underline me-3">Varients</router-link>
                        </td>
                    </tr>
                    <tr v-if="filteredItems.length === 0">
                        <td colspan="3" class="px-6 py-8 text-center text-body">
                            No shop items found.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
</template>