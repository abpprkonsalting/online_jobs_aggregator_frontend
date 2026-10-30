import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { AuthSessionService } from './auth-session.service';

function protectedPath(url: string, apiBaseUrl: string): string | null {
  const base = apiBaseUrl.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(base)) {
    const apiBase = new URL(base);
    const requestUrl = new URL(url, apiBase);
    if (requestUrl.origin !== apiBase.origin) {
      return null;
    }

    const basePath = apiBase.pathname.replace(/\/+$/, '');
    if (basePath && !requestUrl.pathname.startsWith(`${basePath}/`)) {
      return null;
    }
    return basePath ? requestUrl.pathname.slice(basePath.length) : requestUrl.pathname;
  }

  const requestPath = url.split(/[?#]/, 1)[0];
  if (requestPath !== base && !requestPath.startsWith(`${base}/`)) {
    return null;
  }
  return requestPath.slice(base.length) || '/';
}

function acceptsAccessToken(path: string): boolean {
  return path === '/auth/me'
    || /^\/(categories|skills|cities|countries|jobs|users|admin|master)(?:\/|$)/.test(path);
}

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const accessToken = inject(AuthSessionService).getAccessToken();
  const path = protectedPath(request.url, apiBaseUrl);

  if (accessToken === null || path === null || !acceptsAccessToken(path)) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  }));
};
