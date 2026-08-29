<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user.store';
import { useI18n } from 'vue-i18n';
import { db, seedDatabase } from '@/database';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();

const pin = ref<string>('');
const errorMessage = ref<string>('');
const isErrorShake = ref<boolean>(false);
const isLoading = ref<boolean>(false);

onMounted(async () => {
    await seedDatabase();
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
        appendDigit(e.key);
    } else if (e.key === 'Backspace') {
        removeDigit();
    } else if (e.key === 'Enter') {
        submitPin();
    }
};

const appendDigit = (digit: string) => {
    if (pin.value.length < 6) {
        errorMessage.value = '';
        pin.value += digit;
        if (pin.value.length === 6) {
            submitPin();
        }
    }
};

const removeDigit = () => {
    if (pin.value.length > 0) {
        pin.value = pin.value.slice(0, -1);
        errorMessage.value = '';
    }
};

const submitPin = async () => {
    if (pin.value.length !== 6 || isLoading.value) return;

    isLoading.value = true;
    errorMessage.value = '';

    try {
        const pinNum = Number(pin.value);
        const users = await db.users.toArray();
        const matchedUser = users.find(u => u.pin === pinNum);

        if (matchedUser) {
            userStore.setUser(matchedUser);
            router.push('/');
        } else {
            triggerError(t('login.invalid_pin'));
        }
    } catch (e) {
        triggerError(t('login.auth_error'));
    } finally {
        isLoading.value = false;
    }
};

const triggerError = (msg: string) => {
    errorMessage.value = msg;
    isErrorShake.value = true;
    setTimeout(() => {
        isErrorShake.value = false;
        pin.value = '';
    }, 600);
};
</script>

<template>
    <div class="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
        <div class="w-full max-w-sm flex flex-col items-center gap-6 bg-neutral-primary-soft p-8 rounded-base border border-default shadow-xs">
            <div class="text-center">
                <h2 class="text-2xl font-bold text-heading mb-1">{{ t('login.title') }}</h2>
                <p class="text-sm text-body">{{ t('login.subtitle') }}</p>
            </div>

            <!-- PIN Display Indicator Dots -->
            <div :class="{ 'animate-shake': isErrorShake }" class="flex items-center justify-center gap-3 my-2">
                <div v-for="i in 6" :key="i"
                    :class="[
                        'w-4 h-4 rounded-full border-2 transition-all duration-200',
                        pin.length >= i ? 'bg-brand border-brand scale-110' : 'bg-transparent border-default-medium'
                    ]">
                </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="text-xs text-danger font-medium text-center h-4">
                {{ errorMessage }}
            </div>
            <div v-else class="h-4"></div>

            <!-- Keypad -->
            <div class="grid grid-cols-3 gap-3 w-full justify-items-center">
                <button v-for="digit in ['1','2','3','4','5','6','7','8','9']" :key="digit"
                    type="button" @click="appendDigit(digit)"
                    class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-base border border-default text-xl font-bold text-heading bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium active:scale-95 transition-all shadow-xs focus:outline-none">
                    {{ digit }}
                </button>
                <button type="button" @click="removeDigit"
                    class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-base border border-default text-lg font-medium text-body bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium active:scale-95 transition-all shadow-xs focus:outline-none">
                    ⌫
                </button>
                <button type="button" @click="appendDigit('0')"
                    class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-base border border-default text-xl font-bold text-heading bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium active:scale-95 transition-all shadow-xs focus:outline-none">
                    0
                </button>
                <button type="button" @click="submitPin"
                    class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-base border border-transparent text-xl font-bold text-white bg-brand hover:bg-brand-strong active:scale-95 transition-all shadow-xs focus:outline-none">
                    ✓
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
}
.animate-shake {
    animation: shake 0.4s ease-in-out;
}
</style>
