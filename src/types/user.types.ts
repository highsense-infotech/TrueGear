export interface UserRole {
  name: string;
  slug: string;
}

// Record-level scoping (additional layer on top of permissions; never replaces
// them). Returned by the backend on login/profile. Defaults preserve current
// behaviour for every existing user: shopScope 'ALL', warrantyOnly false.
export type ShopScope = 'SERVICE' | 'MAJOR' | 'ALL';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: UserRole | null;
  permissions: string[];
  shopScope?: ShopScope;
  warrantyOnly?: boolean;
}

export interface AuthData {
  token: string;
  user: User;
}
