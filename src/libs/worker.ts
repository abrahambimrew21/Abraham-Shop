import { db } from '@/database';
import { realtimeDb } from '@/libs/firebase';
import { push, ref } from 'firebase/database';

let isPushing = false;
const ledgerRef = ref(realtimeDb, 'global_ledger');

const toFirebasePlain = (value: unknown, seen = new WeakSet<object>()): unknown => {
    if (value === undefined || typeof value === 'function') return undefined;
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (seen.has(value)) return undefined;

    seen.add(value);
    if (Array.isArray(value)) {
        return value.map(item => toFirebasePlain(item, seen) ?? null);
    }

    const plain: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
        const sanitized = toFirebasePlain(nested, seen);
        if (sanitized !== undefined) plain[key] = sanitized;
    }
    return plain;
};

self.onmessage = async () => {
    if (isPushing || !navigator.onLine) return;
    isPushing = true;

    try {
        while (navigator.onLine) {
            const pendingOps = await db._syncQueue.orderBy('id').limit(50).toArray();
            if (pendingOps.length === 0) break;

            for (const op of pendingOps) {
                if (!navigator.onLine) break;

                // Remove internal Dexie ID before sending to cloud
                const { id, ...cloudPayload } = op;

                // Push as a new chronological event in Firebase
                await push(ledgerRef, toFirebasePlain(cloudPayload) as Record<string, unknown>);

                // Remove from local queue on success
                await db._syncQueue.delete(id);
            }
        }
    } catch (error) {
        console.error('Error pushing to Firebase:', error);
        console.warn('Sync paused due to network error');
    } finally {
        isPushing = false;
    }
};