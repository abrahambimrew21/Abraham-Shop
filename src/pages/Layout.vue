<script setup lang="ts">
import NavigationTabs from '@/components/NavigationTabs.vue';
import { db, syncState } from '@/database';
import { realtimeDb } from '@/libs/firebase';
import { getClientId } from '@/libs/syncUtils';
import SyncWorker from '@/libs/worker?worker';
import { onChildAdded, ref } from 'firebase/database';
import { onBeforeUnmount, onMounted } from 'vue';
import { RouterView } from 'vue-router';

const myClientId = getClientId()
const ledgerRef = ref(realtimeDb, 'global_ledger');
let syncWorker: any = null

onMounted(() => {
	syncWorker = new SyncWorker();

	window.addEventListener('online', syncWorker.postMessage);
	// syncWorker.postMessage(null);

	// db._syncQueue.hook('creating', () => {
	// 	setTimeout(syncWorker.postMessage, 50);
	// });


	onChildAdded(ledgerRef, async (snapshot) => {
		const event = snapshot.val();
		if (!event) return;

		// 1. ECHO GUARD: Ignore our own edits!
		if (event.clientId === myClientId) return;

		// 2. TURN ON BYPASS: Don't let Dexie hooks capture this
		syncState.isRemoteWrite = true;

		try {
			const targetTable = db.table(event.table);

			// Perform updates inside a transaction to ensure integrity
			await db.transaction('rw', targetTable, async () => {

				if (event.operation === 'CREATE') {
					await targetTable.put(event.payload);
				}
				else if (event.operation === 'DELETE') {
					await targetTable.delete(event.entityId);
				}
				else if (event.operation === 'UPDATE') {
					const existingRecord = await targetTable.get(event.entityId);
					if (!existingRecord) return; // If we don't have the item, skip update

					const updatedFields = { ...event.propertyReplacements };

					// APPLY IN-PLACE DELTAS (Safely handles out-of-order edits)
					if (event.numericDeltas) {
						for (const [field, delta] of Object.entries(event.numericDeltas)) {
							const currentValue = existingRecord[field] || 0;
							updatedFields[field] = currentValue + delta;
						}
					}

					// Apply directly to the local database
					await targetTable.update(event.entityId, updatedFields);
				}
			});
		} catch (err) {
			console.error("Failed to apply remote sync event:", err);
		} finally {
			// 3. TURN OFF BYPASS
			syncState.isRemoteWrite = false;
		}
	});
});

onBeforeUnmount(() => syncWorker ? syncWorker.terminate() : null)

</script>
<template>
	<section class="max-w-7xl mx-auto px-2 py-2 overflow-x-hidden">
		<router-view />
	</section>
	<navigation-tabs />
</template>