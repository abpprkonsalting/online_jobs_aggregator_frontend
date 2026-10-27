export interface JobListItem {
  id: string;
  source_id: string;
  title: string;
  organization: string | null;
  job_url: string;
  description_text: string | null;
  allow_remote: number | null;
  location?: string | null;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string | null;
  salary_unit: string | null;
  date_posted: string | null;
  posted_at: string | null;
}

export interface JobListResponse {
  jobs: JobListItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type JobSortField =
  | 'posted_at'
  | 'date_posted'
  | 'title'
  | 'organization'
  | 'location'
  | 'salary';

export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  field: JobSortField;
  dir: SortDirection;
}

export interface JobListQuery {
  limit?: number;
  offset?: number;
  sort?: JobSortField;
  sortDir?: SortDirection;
  sorts?: SortCriterion[];
  salary_min?: number;
  salary_max?: number;
  organization?: string;
  location?: string;
  allow_remote?: boolean;
  posted?: string;
}

export interface JobSkill {
  id: string;
  name: string;
  slug: string;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  classification_confidence: string | null;
}

export interface JobLocation {
  id: string;
  city_id: string | null;
  raw_text: string | null;
  city_name: string | null;
  country_id: string | null;
  country_name: string | null;
}

export interface JobDetail extends JobListItem {
  skills: JobSkill[];
  categories: JobCategory[];
  locations: JobLocation[];
  days_waiting: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
}

export interface City {
  id: string;
  country_id: string;
  name: string;
}

export interface Country {
  id: string;
  name: string;
  code: string | null;
}

export type SourceType = 'api' | 'scrape' | 'hybrid';

export type SourceWorkingMode = 'passive' | 'proactive' | 'both';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  working_mode: SourceWorkingMode;
  enabled: number;
}
