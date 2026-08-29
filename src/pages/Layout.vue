<script setup lang="ts">
import { RouterView } from 'vue-router';
import NavigationTabs from '@/components/NavigationTabs.vue';

</script>
<template>
	<section class="max-w-7xl mx-auto px-2 py-2 overflow-x-hidden">
		<router-view />
	</section>
	<navigation-tabs />
</template>