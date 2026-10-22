import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import {
  AdminFetchRun,
  AdminGeographicArea,
  AdminMutationResponse,
  AdminSource,
  AdminSourceArea,
  AdminUser,
  CreateAdminGeographicAreaRequest,
  CreateAdminSourceAreaRequest,
  CreateAdminSourceAreaResponse,
  CreateAdminSourceRequest,
  CreateAdminUserRequest,
  CreateAdminUserResponse,
  UpdateAdminGeographicAreaRequest,
  UpdateAdminSourceRequest,
  UpdateAdminUserRoleResponse,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiClient);

  listUsers(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>('/users');
  }

  createUser(request: CreateAdminUserRequest): Observable<CreateAdminUserResponse> {
    return this.api.post<CreateAdminUserResponse>('/users', request);
  }

  updateUserRole(userId: string, role: 'admin' | 'user'): Observable<UpdateAdminUserRoleResponse> {
    return this.api.patch<UpdateAdminUserRoleResponse>(`/users/${encodeURIComponent(userId)}`, { role });
  }

  deactivateUser(userId: string): Observable<AdminMutationResponse> {
    return this.api.delete<AdminMutationResponse>(`/users/${encodeURIComponent(userId)}`);
  }

  listSources(): Observable<AdminSource[]> {
    return this.api.get<AdminSource[]>('/admin/sources');
  }

  createSource(request: CreateAdminSourceRequest): Observable<AdminSource> {
    return this.api.post<AdminSource>('/admin/sources', request);
  }

  updateSource(sourceId: string, request: UpdateAdminSourceRequest): Observable<AdminSource> {
    return this.api.patch<AdminSource>(`/admin/sources/${encodeURIComponent(sourceId)}`, request);
  }

  deleteSource(sourceId: string): Observable<AdminMutationResponse> {
    return this.api.delete<AdminMutationResponse>(`/admin/sources/${encodeURIComponent(sourceId)}`);
  }

  listGeographicAreas(): Observable<AdminGeographicArea[]> {
    return this.api.get<AdminGeographicArea[]>('/admin/geographic-areas');
  }

  createGeographicArea(
    request: CreateAdminGeographicAreaRequest,
  ): Observable<AdminGeographicArea> {
    return this.api.post<AdminGeographicArea>('/admin/geographic-areas', request);
  }

  updateGeographicArea(
    areaId: string,
    request: UpdateAdminGeographicAreaRequest,
  ): Observable<AdminGeographicArea> {
    return this.api.put<AdminGeographicArea>(
      `/admin/geographic-areas/${encodeURIComponent(areaId)}`,
      request,
    );
  }

  deleteGeographicArea(areaId: string): Observable<AdminMutationResponse> {
    return this.api.delete<AdminMutationResponse>(
      `/admin/geographic-areas/${encodeURIComponent(areaId)}`,
    );
  }

  listSourceAreas(): Observable<AdminSourceArea[]> {
    return this.api.get<AdminSourceArea[]>('/admin/areas');
  }

  createSourceArea(request: CreateAdminSourceAreaRequest): Observable<CreateAdminSourceAreaResponse> {
    return this.api.post<CreateAdminSourceAreaResponse>('/admin/areas', request);
  }

  deleteSourceArea(sourceId: string, areaId: string): Observable<AdminMutationResponse> {
    return this.api.delete<AdminMutationResponse>(
      `/admin/areas/${encodeURIComponent(sourceId)}/${encodeURIComponent(areaId)}`,
    );
  }

  listFetchRuns(): Observable<AdminFetchRun[]> {
    return this.api.get<AdminFetchRun[]>('/admin/fetch-runs');
  }
}
