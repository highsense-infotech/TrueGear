import type { User } from '../types/user.types';

export type AuthState = {
  user: User | null;
};

export const authInitialState: AuthState = {
  user: null,
};

export default authInitialState;
