<script lang="ts" setup>
import type { UserType } from '@/types/user.type';
import { RoleEnum, type RoleType } from '@/types/role.enum';
import { db, seedDatabase, toRawPlain } from '@/database';
import { useI18n } from 'vue-i18n';
import { initModals, initTooltips } from 'flowbite';
import { computed, onMounted, ref } from 'vue';

const { t } = useI18n();

const users = ref<UserType[]>([]);
const selectedUser = ref<UserType | null>(null);
const searchQuery = ref('');

// Add User Form State
const newUserName = ref('');
const newUserPin = ref<number | null>(null);
const newUserRole = ref<RoleType>(RoleEnum.SHOP_KEEPER);
const addUserErrorMessage = ref<string>('');

// Update User Form State
const updateUserName = ref('');
const updateUserPin = ref<number | null>(null);
const updateUserRole = ref<RoleType>(RoleEnum.SHOP_KEEPER);
const updateUserErrorMessage = ref<string>('');

const hideModal = (modalId: string) => {
    const el = document.getElementById(modalId);
    if (el) {
        const closeBtn = el.querySelector<HTMLButtonElement>('[data-modal-hide]');
        if (closeBtn) {
            closeBtn.click();
        }
    }
};

const loadUsers = async () => {
    await seedDatabase();
    users.value = await db.users.toArray();
};

onMounted(async () => {
    await loadUsers();
    initModals();
    initTooltips();
});

const filteredUsers = computed(() => {
    if (!searchQuery.value.trim()) return users.value;
    const q = searchQuery.value.toLowerCase().trim();
    return users.value.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
});

const toggleSelectUser = (u: UserType) => {
    selectedUser.value = selectedUser.value?.id === u.id ? null : u;
};

const handleAddUser = async () => {
    addUserErrorMessage.value = '';

    if (!newUserName.value.trim()) {
        addUserErrorMessage.value = t('users.err_name');
        return;
    }
    if (!newUserPin.value || newUserPin.value < 100000 || newUserPin.value > 999999) {
        addUserErrorMessage.value = t('users.err_pin');
        return;
    }

    const newUser: UserType = {
        id: Date.now().toString(),
        name: newUserName.value.trim(),
        pin: Number(newUserPin.value),
        role: newUserRole.value
    };
    await db.users.add(toRawPlain(newUser));

    newUserName.value = '';
    newUserPin.value = null;
    newUserRole.value = RoleEnum.SHOP_KEEPER;
    addUserErrorMessage.value = '';

    await loadUsers();
    hideModal('add-user-modal');
};

const handleUpdateClick = (e: MouseEvent) => {
    if (!selectedUser.value) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
    }
};

const openUpdateModal = () => {
    if (!selectedUser.value) return;
    updateUserErrorMessage.value = '';
    updateUserName.value = selectedUser.value.name;
    updateUserPin.value = selectedUser.value.pin;
    updateUserRole.value = selectedUser.value.role || RoleEnum.SHOP_KEEPER;
};

const handleUpdateUser = async () => {
    updateUserErrorMessage.value = '';

    if (!selectedUser.value) return;

    if (!updateUserName.value.trim()) {
        updateUserErrorMessage.value = t('users.err_name');
        return;
    }
    if (!updateUserPin.value || updateUserPin.value < 100000 || updateUserPin.value > 999999) {
        updateUserErrorMessage.value = t('users.err_pin');
        return;
    }

    selectedUser.value.name = updateUserName.value.trim();
    selectedUser.value.pin = Number(updateUserPin.value);
    selectedUser.value.role = updateUserRole.value;

    await db.users.put(toRawPlain(selectedUser.value));

    updateUserErrorMessage.value = '';
    await loadUsers();
    hideModal('update-user-modal');
};

const handleDeleteClick = (e: MouseEvent) => {
    if (!selectedUser.value) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
    }
};

const handleDeleteUser = async () => {
    if (!selectedUser.value) return;
    await db.users.delete(selectedUser.value.id);
    selectedUser.value = null;
    await loadUsers();
};
</script>

<template>
    <div class="flex flex-col gap-2 w-full items-center pb-20">
        <h2 class="text-xl font-medium text-primary-900 dark:text-primary-500">{{ t('users.title') }}</h2>

        <div class="p-4">
            <label for="input-group-1" class="sr-only">{{ t('common.search') }}</label>
            <div class="relative">
                <div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input type="text" id="input-group-1" v-model="searchQuery"
                    class="block max-w-96 ps-9 pe-3 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand px-3 py-2.5 shadow-xs placeholder:text-body"
                    :placeholder="t('users.search_placeholder')">
            </div>
        </div>

        <div class="flex items-center justify-center w-full mb-4">
            <!-- Add User Button -->
            <button data-tooltip-target="tooltip-add" class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group"
                data-modal-target="add-user-modal" data-modal-toggle="add-user-modal">
                <v-icon name="md-add-round" scale="1" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('common.add') }}</span>
            </button>
            <div id="tooltip-add" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('users.add_modal_title') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Update User Button -->
            <button data-tooltip-target="tooltip-update"
                data-modal-target="update-user-modal" data-modal-toggle="update-user-modal"
                @click.capture="handleUpdateClick" @click="openUpdateModal"
                :class="{ 'opacity-50 cursor-not-allowed': !selectedUser }"
                class="inline-flex items-center justify-center px-5 hover:bg-neutral-secondary-medium group">
                <v-icon name="md-edit-round" scale="1" class="w-6 h-6 mb-1 text-body group-hover:text-fg-brand" />
                <span class="sr-only">{{ t('common.update') }}</span>
            </button>
            <div id="tooltip-update" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-dark rounded-base shadow-xs opacity-0 tooltip">
                {{ t('common.update') }}
                <div class="tooltip-arrow" data-popper-arrow></div>
            </div>

            <!-- Delete User Button -->
            <button data-tooltip-target="tooltip-delete"
                data-modal-target="delete-modal" data-modal-toggle="delete-modal"
                @click.capture="handleDeleteClick"
                :class="{ 'opacity-50 cursor-not-allowed': !selectedUser }"
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
                        <h3 class="mb-6 text-body">{{ t('users.delete_confirm', { name: selectedUser?.name || '' }) }}</h3>
                        <div class="flex items-center space-x-4 justify-center">
                            <button data-modal-hide="delete-modal" type="button" @click="handleDeleteUser"
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

        <!-- Add User Modal -->
        <div id="add-user-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">{{ t('users.add_modal_title') }}</h3>
                        <button type="button" class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="add-user-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">{{ t('common.close') }}</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleAddUser">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2">
                                <label for="user-name" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.full_name_label') }}</label>
                                <input type="text" name="user-name" id="user-name" v-model="newUserName"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('users.full_name_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="user-pin" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.pin_label') }}</label>
                                <input type="number" name="user-pin" id="user-pin" v-model="newUserPin" min="100000" max="999999"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('users.pin_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="user-role" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.role_label') }}</label>
                                <select id="user-role" v-model="newUserRole"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs" required>
                                    <option :value="RoleEnum.MANAGER">{{ t('users.role_manager') }}</option>
                                    <option :value="RoleEnum.SHOP_KEEPER">{{ t('users.role_shop_keeper') }}</option>
                                </select>
                            </div>
                            <div class="col-span-2" v-if="addUserErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ addUserErrorMessage }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                <svg class="w-4 h-4 me-1.5 -ms-0.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
                                </svg>
                                {{ t('users.create_user_btn') }}
                            </button>
                            <button data-modal-hide="add-user-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.cancel') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Update User Modal -->
        <div id="update-user-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-md max-h-full">
                <div class="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
                    <div class="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                        <h3 class="text-lg font-medium text-heading">Update User</h3>
                        <button type="button" class="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="update-user-modal">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            <span class="sr-only">{{ t('common.close') }}</span>
                        </button>
                    </div>
                    <form @submit.prevent="handleUpdateUser">
                        <div class="grid gap-4 grid-cols-2 py-4 md:py-6">
                            <div class="col-span-2">
                                <label for="update-user-name" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.full_name_label') }}</label>
                                <input type="text" name="update-user-name" id="update-user-name" v-model="updateUserName"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('users.full_name_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="update-user-pin" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.pin_label') }}</label>
                                <input type="number" name="update-user-pin" id="update-user-pin" v-model="updateUserPin" min="100000" max="999999"
                                    class="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                                    :placeholder="t('users.pin_placeholder')" required>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="update-user-role" class="block mb-2.5 text-sm font-medium text-heading">{{ t('users.role_label') }}</label>
                                <select id="update-user-role" v-model="updateUserRole"
                                    class="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs" required>
                                    <option :value="RoleEnum.MANAGER">{{ t('users.role_manager') }}</option>
                                    <option :value="RoleEnum.SHOP_KEEPER">{{ t('users.role_shop_keeper') }}</option>
                                </select>
                            </div>
                            <div class="col-span-2" v-if="updateUserErrorMessage">
                                <div class="p-3 bg-danger-softer border border-danger-subtle rounded-base text-xs font-semibold text-danger-strong">
                                    ⚠️ {{ updateUserErrorMessage }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 border-t border-default pt-4 md:pt-6">
                            <button type="submit"
                                class="inline-flex items-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.update') }}
                            </button>
                            <button data-modal-hide="update-user-modal" type="button"
                                class="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                                {{ t('common.cancel') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Users Table -->
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
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('users.col_name') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('users.col_role') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium">{{ t('users.col_pin') }}</th>
                        <th scope="col" class="px-6 py-3 font-medium text-right"><span class="sr-only">{{ t('common.actions') }}</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in filteredUsers" :key="user.id"
                        :class="{ 'bg-neutral-secondary-medium': selectedUser?.id === user.id }"
                        class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium cursor-pointer"
                        @click="toggleSelectUser(user)">
                        <td class="w-4 p-4" @click.stop>
                            <div class="flex items-center">
                                <input :id="'table-checkbox-' + user.id" type="checkbox"
                                    :checked="selectedUser?.id === user.id"
                                    @change="toggleSelectUser(user)"
                                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft">
                                <label :for="'table-checkbox-' + user.id" class="sr-only">Table checkbox</label>
                            </div>
                        </td>
                        <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">{{ user.name }}</th>
                        <td class="px-6 py-4 capitalize">{{ user.role ? user.role.replace('_', ' ') : 'User' }}</td>
                        <td class="px-6 py-4 font-mono tracking-widest">••••••</td>
                        <td class="px-6 py-4 text-right" @click.stop></td>
                    </tr>
                    <tr v-if="filteredUsers.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-body">{{ t('users.no_users') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
