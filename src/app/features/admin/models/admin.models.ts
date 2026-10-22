import { SourceType, SourceWorkingMode } from '../../../core/models/api.models';
import { UserRole } from '../../auth/models/auth.models';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface CreateAdminUserResponse {
  id: string;
  email: string;
  role: UserRole;
}

export interface UpdateAdminUserRoleResponse {
  id: string;
  role: UserRole;
}

export interface AdminMutationResponse {
  success: boolean;
}

export interface AdminSource {
  id: string;
  name: string;
  type: SourceType;
  working_mode: SourceWorkingMode;
  config: Record<string, unknown>;
  enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminSourceRequest {
  name: string;
  type: SourceType;
  working_mode?: SourceWorkingMode;
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateAdminSourceRequest {
  name?: string;
  working_mode?: SourceWorkingMode;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface AdminGeographicArea {
  id: string;
  name: string;
  definition: Record<string, unknown>;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminGeographicAreaRequest {
  name: string;
  definition: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateAdminGeographicAreaRequest {
  name?: string;
  definition?: Record<string, unknown>;
}

export interface AdminSourceArea {
  source_id: string;
  source_name: string;
  geographic_area_id: string;
  area_name: string;
  area_definition: Record<string, unknown>;
  enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface CreateAdminSourceAreaRequest {
  source_id: string;
  geographic_area_id: string;
  enabled?: boolean;
}

export interface CreateAdminSourceAreaResponse {
  source_id: string;
  geographic_area_id: string;
  enabled: boolean;
}

export interface AdminFetchRun {
  id: string;
  source_id: string | null;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  jobs_saved_new: number;
  jobs_saved_updated: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  warnings: string[] | null;
  created_at: string;
  updated_at: string;
}
