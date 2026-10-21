import { Category } from '../../../core/models/api.models';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface UserCategoryInterest extends Category {
  enabled: number;
  created_at: string;
}

export interface UserCategoryInterestMutation {
  user_id: string;
  category_id: string;
}

export interface UserCategoryInterestDeleteResponse {
  success: boolean;
}
