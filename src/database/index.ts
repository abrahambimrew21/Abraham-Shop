import { generateHLC, getClientId } from '@/libs/syncUtils';
import type { SyncQueue } from '@/types/change.type';
import type { Inventory, Restock } from '@/types/inventory.type';
import type { Item } from '@/types/items.type';
import { RoleEnum } from '@/types/role.enum';
import type { Shop } from '@/types/shop.type';
import type { UserType } from '@/types/user.type';
import Dexie, { type EntityTable, type Table } from 'dexie';
import { toRaw } from 'vue';

export const syncState = { isRemoteWrite: false };

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

const queueChange = (change: Omit<SyncQueue, 'id'>) => {
    return Dexie.ignoreTransaction(() => db._syncQueue.add(change));
};

Object.keys(tables).forEach(tbl => {
    if (tbl === '_syncQueue') return;
    const table = db.table(tbl) as Table<any, any>;

    // Hook 1: Record Creations
    table.hook('creating', (primaryKey, obj) => {
        if (syncState.isRemoteWrite) return;
        return queueChange({
            table: tbl,
            entityId: primaryKey || obj.id,
            operation: 'CREATE',
            payload: obj, // Send full object on creation
            clientId: getClientId(),
            hlc: generateHLC()
        });
    });

    // Hook 2: Calculate and Record Deltas for Updates
    table.hook('updating', (modifications, primaryKey, obj) => {
        if (syncState.isRemoteWrite) return;

        const numericDeltas: any = {};
        const propertyReplacements: any = {};

        for (const [key, value] of Object.entries(modifications)) {
            // If it's a number, calculate the delta (e.g., 28 - 30 = -2)
            if (typeof value === 'number' && typeof obj[key] === 'number') {
                numericDeltas[key] = value - obj[key];
            } else {
                // Text, booleans, or replacing null with a number
                propertyReplacements[key] = value;
            }
        }

        return queueChange({
            table: tbl,
            entityId: primaryKey,
            operation: 'UPDATE',
            numericDeltas,
            propertyReplacements,
            clientId: getClientId(),
            hlc: generateHLC()
        });
    });

    // Hook 3: Record Deletions
    table.hook('deleting', (primaryKey) => {
        if (syncState.isRemoteWrite) return;
        return queueChange({
            table: tbl,
            entityId: primaryKey,
            operation: 'DELETE',
            clientId: getClientId(),
            hlc: generateHLC()
        });
    });
})

export const toRawPlain = <T>(obj: T): T => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(toRaw(obj)));
};

export const seedDatabase = async () => {
    try {
        const itemCount = await db.items.count();
        if (itemCount === 0) {
            const defaultItems: Item[] = [
                { id: '1', name: 'Mirinda', unit: 'ml' },
                { id: '2', name: 'Coca-Cola', unit: 'ml' },
                { id: '3', name: 'Soap', unit: 'g' },
                { id: '5', name: 'Rice', unit: 'kg' }
            ];
            await db.items.bulkAdd(toRawPlain(defaultItems));
        }

        const inventoryCount = await db.inventory.count();
        if (inventoryCount === 0) {
            const defaultInventory: Inventory[] = [
                {
                    id: '1',
                    item: { id: '1', name: 'Mirinda', unit: 'ml' },
                    quantity: 10,
                    acquiredPrice: 150,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 5,
                },
                {
                    id: '2',
                    item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
                    quantity: 20,
                    acquiredPrice: 140,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 5,
                },
                {
                    id: '3',
                    item: { id: '3', name: 'Soap', unit: 'g' },
                    quantity: 30,
                    acquiredPrice: 160,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 10,
                },
                {
                    id: '4',
                    item: { id: '5', name: 'Rice', unit: 'kg' },
                    quantity: 15,
                    acquiredPrice: 1700,
                    sellingPrice: 2000,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 5,
                }
            ];
            await db.inventory.bulkAdd(toRawPlain(defaultInventory));
        }

        const historyCount = await db.restockHistory.count();
        if (historyCount === 0) {
            const defaultHistory: Restock[] = [
                {
                    id: '1',
                    inventory: {
                        id: '1',
                        item: { id: '1', name: 'Mirinda', unit: 'ml' },
                        quantity: 10,
                        acquiredPrice: 150,
                        sellingPrice: 200,
                        stockedDate: new Date(),
                        runOutDate: null,
                        runOutThreshhold: 5,
                    },
                    quantity: 100,
                    acquiredPrice: 150,
                    sellingPrice: 200,
                    restockDate: new Date('2025-03-13T10:00:00Z')
                },
                {
                    id: '2',
                    inventory: {
                        id: '2',
                        item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
                        quantity: 20,
                        acquiredPrice: 140,
                        sellingPrice: 200,
                        stockedDate: new Date(),
                        runOutDate: null,
                        runOutThreshhold: 5,
                    },
                    quantity: 50,
                    acquiredPrice: 140,
                    sellingPrice: 200,
                    restockDate: new Date('2025-03-14T14:30:00Z')
                }
            ];
            await db.restockHistory.bulkAdd(toRawPlain(defaultHistory));
        }

        const userCount = await db.users.count();
        if (userCount === 0) {
            const defaultUsers: UserType[] = [
                { id: '1', name: 'Manager User', pin: 123456, role: RoleEnum.MANAGER },
                { id: '2', name: 'Shop Keeper User', pin: 654321, role: RoleEnum.SHOP_KEEPER },
            ];
            await db.users.bulkAdd(toRawPlain(defaultUsers));
        }

        const salesCount = await db.sales.count();
        if (salesCount === 0) {
            const defaultSales: Shop[] = [
                {
                    id: '1',
                    inventory: {
                        id: '1',
                        item: { id: '1', name: 'Mirinda', unit: 'ml' },
                        quantity: 10,
                        acquiredPrice: 150,
                        sellingPrice: 200,
                        stockedDate: new Date(),
                        runOutDate: null,
                        runOutThreshhold: 5,
                    },
                    quantity: 2,
                    acquiredPrice: 150,
                    sellingPrice: 200,
                    totalRevenue: 400,
                    totalCost: 300,
                    margin: 100,
                    dateSold: new Date()
                },
                {
                    id: '2',
                    inventory: {
                        id: '2',
                        item: { id: '2', name: 'Coca-Cola', unit: 'ml' },
                        quantity: 20,
                        acquiredPrice: 140,
                        sellingPrice: 200,
                        stockedDate: new Date(),
                        runOutDate: null,
                        runOutThreshhold: 5,
                    },
                    quantity: 5,
                    acquiredPrice: 140,
                    sellingPrice: 200,
                    totalRevenue: 1000,
                    totalCost: 700,
                    margin: 300,
                    dateSold: new Date()
                }
            ];
            await db.sales.bulkAdd(toRawPlain(defaultSales));
        }
    } catch (e) {
        console.error('Error seeding Dexie DB:', e);
    }
};

export { db };
