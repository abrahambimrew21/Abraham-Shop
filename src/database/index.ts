import Dexie, { type EntityTable } from 'dexie';
import { toRaw } from 'vue';
import type { Inventory, Restock } from '@/types/inventory.type';
import type { Item } from '@/types/items.type';
import type { Shop } from '@/types/shop.type';
import type { UserType } from '@/types/user.type';
import { RoleEnum } from '@/types/role.enum';

export interface ShopDatabase extends Dexie {
    items: EntityTable<Item, 'id'>;
    inventory: EntityTable<Inventory, 'id'>;
    restockHistory: EntityTable<Restock, 'id'>;
    users: EntityTable<UserType, 'id'>;
    sales: EntityTable<Shop, 'id'>;
}

const db = new Dexie('AbrahamShopDB') as ShopDatabase;

db.version(1).stores({
    items: 'id, name',
    inventory: 'id',
    restockHistory: 'id, restockDate',
    users: 'id, name, pin, role',
    sales: 'id, dateSold'
});

export const toRawPlain = <T>(obj: T): T => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(toRaw(obj)));
};

export const seedDatabase = async () => {
    try {
        const itemCount = await db.items.count();
        if (itemCount === 0) {
            const defaultItems: Item[] = [
                {
                    id: '1',
                    name: 'Mirinda',
                    varient: [
                        { id: '1', name: '500ml', unit: 'ml' },
                        { id: '2', name: '1L', unit: 'ml' },
                        { id: '3', name: '2L', unit: 'ml' },
                    ]
                },
                {
                    id: '2',
                    name: 'Coca-Cola',
                    varient: [
                        { id: '1', name: '500ml', unit: 'ml' },
                        { id: '2', name: '1L', unit: 'ml' },
                        { id: '3', name: '2L', unit: 'ml' },
                    ]
                },
                {
                    id: '3',
                    name: 'Soap',
                    varient: [
                        { id: '1', name: '500g', unit: 'g' },
                        { id: '2', name: '1kg', unit: 'g' },
                        { id: '3', name: '2kg', unit: 'g' },
                    ]
                },
                {
                    id: '5',
                    name: 'Rice',
                    varient: [
                        { id: '1', name: '5kg', unit: 'kg' },
                        { id: '2', name: '10kg', unit: 'kg' },
                    ]
                }
            ];
            await db.items.bulkAdd(toRawPlain(defaultItems));
        }

        const inventoryCount = await db.inventory.count();
        if (inventoryCount === 0) {
            const defaultInventory: Inventory[] = [
                {
                    id: '1',
                    item: { id: '1', name: 'Mirinda' },
                    varient: { id: '1', name: '500ml', unit: 'ml' },
                    quantity: 10,
                    acquiredPrice: 150,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 5,
                },
                {
                    id: '2',
                    item: { id: '2', name: 'Coca-Cola' },
                    varient: { id: '1', name: '500ml', unit: 'ml' },
                    quantity: 20,
                    acquiredPrice: 140,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 5,
                },
                {
                    id: '3',
                    item: { id: '3', name: 'Soap' },
                    varient: { id: '1', name: '500g', unit: 'g' },
                    quantity: 30,
                    acquiredPrice: 160,
                    sellingPrice: 200,
                    stockedDate: new Date(),
                    runOutDate: null,
                    runOutThreshhold: 10,
                },
                {
                    id: '4',
                    item: { id: '5', name: 'Rice' },
                    varient: { id: '1', name: '5kg', unit: 'kg' },
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
                        item: { id: '1', name: 'Mirinda' },
                        varient: { id: '1', name: '500ml', unit: 'ml' },
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
                        item: { id: '2', name: 'Coca-Cola' },
                        varient: { id: '1', name: '500ml', unit: 'ml' },
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
                        item: { id: '1', name: 'Mirinda' },
                        varient: { id: '1', name: '500ml', unit: 'ml' },
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
                        item: { id: '2', name: 'Coca-Cola' },
                        varient: { id: '1', name: '500ml', unit: 'ml' },
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
