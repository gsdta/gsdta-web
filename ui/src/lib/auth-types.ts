export type Role = "admin" | "teacher" | "parent";

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
}
