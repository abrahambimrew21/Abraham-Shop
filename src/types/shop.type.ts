import type { Inventory } from "./inventory.type";

export interface Shop {
    id: string;
    inventory: Inventory;
    quantity: number;
    acquiredPrice: number;
    sellingPrice: number;
    totalRevenue: number;
    totalCost: number;
    margin: number;
    dateSold: Date;
}

export interface SoldHistory {
    id: string;
    date: Date;
    shop: Shop[];
}