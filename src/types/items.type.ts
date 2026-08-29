export interface ItemVarient {
    id: string;
    name: string;
    unit: string;
}

export interface Item {
    id: string;
    name: string;
    varient: ItemVarient[];
}
