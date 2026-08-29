export const RoleEnum = {
    MANAGER: 'manager',
    SHOP_KEEPER: 'shop_keeper',
} as const

export type RoleType = typeof RoleEnum[keyof typeof RoleEnum]