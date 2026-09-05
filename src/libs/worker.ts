import { db } from '@/database';
import { realtimeDb } from '@/libs/firebase';
import { push, ref } from 'firebase/database';

let isPushing = false;
const ledgerRef = ref(realtimeDb, 'global_ledger');

self.onmessage = async () => {
    if (isPushing || !navigator.onLine) return;
    isPushing = true;

    try {
        const pendingOps = await db._syncQueue.orderBy('id').toArray();

        for (const op of pendingOps) {
            // Remove internal Dexie ID before sending to cloud
            const { id, ...cloudPayload } = op;

            // Push as a new chronological event in Firebase
            await push(ledgerRef, cloudPayload);

            // Remove from local queue on success
            await db._syncQueue.delete(id);
        }
    } catch (error) {
        console.warn('Sync paused due to network error');
    } finally {
        isPushing = false;
    }
};