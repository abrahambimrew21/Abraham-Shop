<script setup lang="ts">
import { RouterView } from 'vue-router';
// import Header from '../components/Header.vue';
import NavigationTabs from '@/components/NavigationTabs.vue';




</script>
<template>
	<!-- <Header 
		:on-logout="() => {
			console.log('Logged out here!')
		}"
		:navbar-items="navbarItems"
	/> -->
	<section class="max-w-7xl mx-auto px-2 py-2">
		<router-view />
	</section>
	<navigation-tabs/>
</template>