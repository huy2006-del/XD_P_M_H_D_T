export type UserRole = "ADMIN" | "OPERATOR";

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
}