import type { RoleType } from "./role.enum";

export interface UserType {
    id: string;
    name: string;
    pin: number;
    role?: RoleType;
}