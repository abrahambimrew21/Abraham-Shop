import type { Item, ItemVarient } from "./items.type";

export interface Inventory {
    id: string;
    item: Omit<Item, 'varient'>;
    varient: ItemVarient;
    quantity: number;
    acquiredPrice: number;
    sellingPrice: number;
    stockedDate: Date;
    runOutDate: Date | null;
    runOutThreshhold: number;
}

export interface Restock {
    id: string;
    inventory: Inventory;
    quantity: number;
    acquiredPrice: number;
    sellingPrice: number;
    restockDate: Date;
}