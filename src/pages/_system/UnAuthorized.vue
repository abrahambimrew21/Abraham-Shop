<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
    <h1 class="text-heading text-2xl font-bold text-center p-20">{{ t('_system.unauthorized') }}</h1>
</template>