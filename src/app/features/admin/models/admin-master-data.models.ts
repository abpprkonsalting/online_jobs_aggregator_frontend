import { Category, City, Country, Skill } from '../../../core/models/api.models';
import { AdminGeographicArea } from './admin.models';

export interface AdminKeyword {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface AdminMasterSchema {
  countries: Country[];
  cities: City[];
  skills: Skill[];
  categories: Category[];
  geographic_areas: AdminGeographicArea[];
}

export interface CreateAdminCategoryRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateAdminKeywordRequest {
  name: string;
  slug: string;
  category_id?: string;
  enabled?: boolean;
}

export interface CreateAdminKeywordResponse {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  enabled: boolean;
}

export interface SeedAdminSkillsRequest {
  skills: { name: string; slug: string }[];
}

export interface SeedAdminCountriesRequest {
  countries: { name: string; code?: string }[];
}

export interface SeedAdminCitiesRequest {
  cities: { name: string; country_id: string }[];
}

export interface SeedAdminDataResponse {
  seeded: number;
}

export interface CreateAdminCategoryKeywordRequest {
  category_id: string;
  keyword_id: string;
  weight?: number;
  enabled?: boolean;
}

export interface CreateAdminCategoryKeywordResponse {
  category_id: string;
  keyword_id: string;
  weight?: number;
  enabled: boolean;
}

export interface CategoryKeywordLink {
  category_id: string;
  category_name: string;
  category_slug: string;
  keyword_id: string;
  keyword_name: string;
  keyword_slug: string;
  weight: number | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}
