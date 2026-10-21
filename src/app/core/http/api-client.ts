import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';

export interface ApiRequestOptions {
  params?: HttpParams;
  withCredentials?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), options);
  }

  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body, options);
  }

  put<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body, options);
  }

  patch<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.buildUrl(path), body, options);
  }

  delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path), options);
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }
}
