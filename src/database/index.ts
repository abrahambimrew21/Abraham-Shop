import { generateHLC, getClientId } from '@/libs/syncUtils';
import type { SyncQueue } from '@/types/change.type';
import type { Inventory, Restock } from '@/types/inventory.type';
import type { Item } from '@/types/items.type';
import { RoleEnum } from '@/types/role.enum';
import type { Shop } from '@/types/shop.type';
import type { UserType } from '@/types/user.type';
import Dexie, { type EntityTable, type Table } from 'dexie';
import { toRaw } from 'vue';

class SyncStateManager {
    private _depth = 0;

    get isRemoteWrite(): boolean {
        return this._depth > 0;
    }

    set isRemoteWrite(val: boolean) {
        if (val) {
            this._depth = Math.max(1, this._depth + 1);
        } else {
            this._depth = Math.max(0, this._depth - 1);
        }
    }

    beginRemote(): void {
        this._depth++;
    }

    endRemote(): void {
        this._depth = Math.max(0, this._depth - 1);
    }
}

export const syncState = new SyncStateManager();

type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();

export function onSyncQueueChange(listener: SyncListener): () => void {
    syncListeners.add(listener);
    return () => {
        syncListeners.delete(listener);
    };
}

function notifySyncQueue(): void {
    for (const listener of syncListeners) {
        try {
            listener();
        } catch (err) {
            console.error('Error in sync listener:', err);
        }
    }
}

export function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
        if (curr == null) return undefined;
        curr = curr[part];
    }
    return curr;
}

export interface ShopDatabase extends Dexie {
    items: EntityTable<Item, 'id'>;
    inventory: EntityTable<Inventory, 'id'>;
    restockHistory: EntityTable<Restock, 'id'>;
    users: EntityTable<UserType, 'id'>;
    sales: EntityTable<Shop, 'id'>;
    _syncQueue: EntityTable<SyncQueue, 'id'>;
}

const db = new Dexie('AbrahamShopDB') as ShopDatabase;

const tables = {
    items: 'id, name',
    inventory: 'id',
    restockHistory: 'id, restockDate',
    users: 'id, name, pin, role',
    sales: 'id, dateSold',
    _syncQueue: '++id, table, entityId, operation'
}

db.version(2).stores(tables);

const toRawPlain = <T>(value: T): T => {
    const seen = new WeakSet<object>();

    const sanitize = (current: unknown): unknown => {
        const raw = toRaw(current);

        if (raw === undefined || typeof raw === 'function') return undefined;
        if (raw === null || typeof raw !== 'object') {
            return raw;
        }
        if (raw instanceof Date) return new Date(raw.getTime());
        if (seen.has(raw)) return undefined;

        seen.add(raw);
        if (Array.isArray(raw)) {
            return raw.map(value => sanitize(value) ?? null);
        }

        const plain: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(raw)) {
            const sanitized = sanitize(nested);
            if (sanitized !== undefined) plain[key] = sanitized;
        }
        return plain;
    };

    return sanitize(value) as T;
};

const queueChange = async (change: Omit<SyncQueue, 'id'>) => {
    try {
        // Prevent DataCloneError by stripping Vue reactive proxies and hidden functions
        const rawObj = toRawPlain(change);
        const sanitized = JSON.parse(JSON.stringify(rawObj));

        // Prevent NotFoundError (transaction scope issues) by isolating transaction
        await Dexie.ignoreTransaction(() => db._syncQueue.add(sanitized));
        notifySyncQueue();
    } catch (err) {
        console.error('Error queuing mutation to _syncQueue:', err);
    }
};

Object.keys(tables).forEach(tbl => {
    if (tbl === '_syncQueue') return;
    const table = db.table(tbl) as Table<any, any>;

    // Hook 1: Record Creations
    table.hook('creating', function (this: any, primaryKey, obj, transaction) {
        if (syncState.isRemoteWrite || (transaction as any)?.isRemote) return;
        const initialKey = primaryKey || obj?.id;

        // Use onsuccess to queue only upon successful commit and return undefined so Dexie doesn't override the primaryKey
        this.onsuccess = (actualKey: any) => {
            void queueChange({
                table: tbl,
                entityId: actualKey || initialKey,
                operation: 'CREATE',
                payload: obj,
                clientId: getClientId(),
                hlc: generateHLC()
            });
        };
    });

    // Hook 2: Calculate and Record Deltas for Updates
    table.hook('updating', function (this: any, modifications, primaryKey, obj, transaction) {
        if (syncState.isRemoteWrite || (transaction as any)?.isRemote) return;

        const numericDeltas: Record<string, number> = {};
        const propertyReplacements: Record<string, any> = {};

        for (const [key, value] of Object.entries(modifications)) {
            const currentVal = key.includes('.') ? getNestedValue(obj, key) : (obj ? obj[key] : undefined);
            if (typeof value === 'number') {
                const baseVal = typeof currentVal === 'number' ? currentVal : 0;
                numericDeltas[key] = value - baseVal;
            } else {
                propertyReplacements[key] = value;
            }
        }

        for (const key of Object.keys(numericDeltas)) {
            delete propertyReplacements[key];
        }

        if (Object.keys(numericDeltas).length === 0 && Object.keys(propertyReplacements).length === 0) {
            return;
        }

        // Use onsuccess and return undefined so Dexie doesn't replace modifications with a Promise
        this.onsuccess = () => {
            void queueChange({
                table: tbl,
                entityId: primaryKey,
                operation: 'UPDATE',
                numericDeltas,
                propertyReplacements,
                clientId: getClientId(),
                hlc: generateHLC()
            });
        };
    });

    // Hook 3: Record Deletions
    table.hook('deleting', function (this: any, primaryKey, _obj, transaction) {
        if (syncState.isRemoteWrite || (transaction as any)?.isRemote) return;

        // Use onsuccess and return undefined
        this.onsuccess = () => {
            void queueChange({
                table: tbl,
                entityId: primaryKey,
                operation: 'DELETE',
                clientId: getClientId(),
                hlc: generateHLC()
            });
        };
    });
});

export { toRawPlain };

export const seedDatabase = async () => {
    syncState.beginRemote();
    try {
        // const itemCount = await db.items.count();
        // if (itemCount === 0) {
        //     const defaultItems: Item[] = [
        //         { id: '1', name: 'Mirinda', unit: 'ml' },
        //         { id: '2', name: 'Coca-Cola', unit: 'ml' },
        //         { id: '3', name: 'Soap', unit: 'g' },
        //         { id: '5', name: 'Rice', unit: 'kg' }
        //     ];
        //     await db.items.bulkAdd(toRawPlain(defaultItems));
        // }

        // const inventoryCount = await db.inventory.count();
        // if (inventoryCount === 0) {
        //     const defaultInventory: Inventory[] = [
        //         {
        //             id: '1',
        //             item: { id: '1', name: 'Mirinda', unit: 'ml' },
        //             quantity: 10,
        //             acquiredPrice: 150,
        //             sellingPrice: 200,
        //             stockedDate: new Date(),
        //             runOutDate: null,
        //             runOutThreshhold: 5,
        //         },
        //         {
        //             id: '2',
        //             item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
        //             quantity: 20,
        //             acquiredPrice: 140,
        //             sellingPrice: 200,
        //             stockedDate: new Date(),
        //             runOutDate: null,
        //             runOutThreshhold: 5,
        //         },
        //         {
        //             id: '3',
        //             item: { id: '3', name: 'Soap', unit: 'g' },
        //             quantity: 30,
        //             acquiredPrice: 160,
        //             sellingPrice: 200,
        //             stockedDate: new Date(),
        //             runOutDate: null,
        //             runOutThreshhold: 10,
        //         },
        //         {
        //             id: '4',
        //             item: { id: '5', name: 'Rice', unit: 'kg' },
        //             quantity: 15,
        //             acquiredPrice: 1700,
        //             sellingPrice: 2000,
        //             stockedDate: new Date(),
        //             runOutDate: null,
        //             runOutThreshhold: 5,
        //         }
        //     ];
        //     await db.inventory.bulkAdd(toRawPlain(defaultInventory));
        // }

        // const historyCount = await db.restockHistory.count();
        // if (historyCount === 0) {
        //     const defaultHistory: Restock[] = [
        //         {
        //             id: '1',
        //             inventory: {
        //                 id: '1',
        //                 item: { id: '1', name: 'Mirinda', unit: 'ml' },
        //                 quantity: 10,
        //                 acquiredPrice: 150,
        //                 sellingPrice: 200,
        //                 stockedDate: new Date(),
        //                 runOutDate: null,
        //                 runOutThreshhold: 5,
        //             },
        //             quantity: 100,
        //             acquiredPrice: 150,
        //             sellingPrice: 200,
        //             restockDate: new Date('2025-03-13T10:00:00Z')
        //         },
        //         {
        //             id: '2',
        //             inventory: {
        //                 id: '2',
        //                 item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
        //                 quantity: 20,
        //                 acquiredPrice: 140,
        //                 sellingPrice: 200,
        //                 stockedDate: new Date(),
        //                 runOutDate: null,
        //                 runOutThreshhold: 5,
        //             },
        //             quantity: 50,
        //             acquiredPrice: 140,
        //             sellingPrice: 200,
        //             restockDate: new Date('2025-03-14T14:30:00Z')
        //         }
        //     ];
        //     await db.restockHistory.bulkAdd(toRawPlain(defaultHistory));
        // }

        const userCount = await db.users.count();
        if (userCount === 0) {
            const defaultUsers: UserType[] = [
                { id: '1', name: 'Manager User', pin: 123456, role: RoleEnum.MANAGER },
                { id: '2', name: 'Shop Keeper User', pin: 654321, role: RoleEnum.SHOP_KEEPER },
            ];
            await db.users.bulkAdd(toRawPlain(defaultUsers));
        }

        // const salesCount = await db.sales.count();
        // if (salesCount === 0) {
        //     const defaultSales: Shop[] = [
        //         {
        //             id: '1',
        //             inventory: {
        //                 id: '1',
        //                 item: { id: '1', name: 'Mirinda', unit: 'ml' },
        //                 quantity: 10,
        //                 acquiredPrice: 150,
        //                 sellingPrice: 200,
        //                 stockedDate: new Date(),
        //                 runOutDate: null,
        //                 runOutThreshhold: 5,
        //             },
        //             quantity: 2,
        //             acquiredPrice: 150,
        //             sellingPrice: 200,
        //             totalRevenue: 400,
        //             totalCost: 300,
        //             margin: 100,
        //             dateSold: new Date()
        //         },
        //         {
        //             id: '2',
        //             inventory: {
        //                 id: '2',
        //                 item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
        //                 quantity: 20,
        //                 acquiredPrice: 140,
        //                 sellingPrice: 200,
        //                 stockedDate: new Date(),
        //                 runOutDate: null,
        //                 runOutThreshhold: 5,
        //             },
        //             quantity: 5,
        //             acquiredPrice: 140,
        //             sellingPrice: 200,
        //             totalRevenue: 1000,
        //             totalCost: 700,
        //             margin: 300,
        //             dateSold: new Date()
        //         }
        //     ];
        //     await db.sales.bulkAdd(toRawPlain(defaultSales));
        // }
    } catch (e) {
        console.error('Error seeding Dexie DB:', e);
    } finally {
        syncState.endRemote();
    }
};

export { db };
