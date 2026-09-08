<script setup lang="ts">
import NavigationTabs from '@/components/NavigationTabs.vue';
import { db, getNestedValue, onSyncQueueChange, syncState } from '@/database';
import { realtimeDb } from '@/libs/firebase';
import { getClientId, updateHLC } from '@/libs/syncUtils';
import SyncWorker from '@/libs/worker?worker';
import { onChildAdded, ref as dbRef } from 'firebase/database';
import { onBeforeUnmount, onMounted } from 'vue';
import { RouterView } from 'vue-router';

const myClientId = getClientId();
const ledgerRef = dbRef(realtimeDb, 'global_ledger');
let syncWorker: Worker | null = null;
let unsubscribeSync: (() => void) | null = null;

const triggerSync = () => {
	try {
		if (navigator.onLine && syncWorker) {
			syncWorker.postMessage(null);
		}
	} catch (err) {
		console.error('Failed to post message to sync worker:', err);
	}
};

// const viewKey = ref(0);
// let refreshTimeout: any = null;
// const refreshView = () => {
// 	clearTimeout(refreshTimeout);
// 	refreshTimeout = setTimeout(() => {
// 		viewKey.value++;
// 	}, 80);
// };

onMounted(() => {
	syncWorker = new SyncWorker();

	window.addEventListener('online', triggerSync);
	unsubscribeSync = onSyncQueueChange(triggerSync);

	// Initial trigger to drain any offline queue
	triggerSync();

	onChildAdded(ledgerRef, async (snapshot) => {
		const event = snapshot.val();
		if (!event) return;

		// 1. ECHO GUARD: Ignore our own edits!
		if (event.clientId === myClientId) return;

		// Advance local HLC using remote timestamp
		if (event.hlc) {
			updateHLC(event.hlc);
		}

		// 2. TURN ON BYPASS: Don't let Dexie hooks capture this
		syncState.beginRemote();

		try {
			const targetTable = db.table(event.table);
			if (!targetTable) return;

			// Perform updates inside a transaction to ensure integrity
			await db.transaction('rw', targetTable, async (tx) => {
				(tx as any).isRemote = true;

				if (event.operation === 'CREATE') {
					const existing = await targetTable.get(event.entityId || event.payload?.id);
					// Never overwrite existing local entities on late-arriving CREATE events
					if (!existing) {
						await targetTable.put(event.payload);
					}
				}
				else if (event.operation === 'DELETE') {
					await targetTable.delete(event.entityId);
				}
				else if (event.operation === 'UPDATE') {
					const existingRecord = await targetTable.get(event.entityId);
					if (!existingRecord) return; // If we don't have the item, skip update

					const numericDeltas = event.numericDeltas || {};
					const updatedFields: Record<string, any> = {};

					for (const [field, value] of Object.entries(event.propertyReplacements || {})) {
						if (!(field in numericDeltas)) {
							updatedFields[field] = value;
						}
					}

					// APPLY IN-PLACE DELTAS (Safely handles out-of-order edits)
					for (const [field, delta] of Object.entries(numericDeltas)) {
						const currentVal = field.includes('.')
							? getNestedValue(existingRecord, field)
							: existingRecord[field];
						const baseVal = typeof currentVal === 'number' ? currentVal : 0;
						updatedFields[field] = baseVal + Number(delta);
					}

					// Apply directly to the local database
					await targetTable.update(event.entityId, updatedFields);
				}
			});

			// refreshView();
		} catch (err) {
			console.error("Failed to apply remote sync event:", err);
		} finally {
			// 3. TURN OFF BYPASS
			syncState.endRemote();
		}
	});
});

onBeforeUnmount(() => {
	window.removeEventListener('online', triggerSync);
	if (unsubscribeSync) {
		unsubscribeSync();
		unsubscribeSync = null;
	}
	if (syncWorker) {
		syncWorker.terminate();
		syncWorker = null;
	}
	// clearTimeout(refreshTimeout);
});

</script>
<template>
	<section class="max-w-7xl mx-auto px-2 py-2 overflow-x-hidden">
		<router-view />
	</section>
	<navigation-tabs />
</template>