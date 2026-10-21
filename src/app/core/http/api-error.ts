import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'network'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'http';

export interface ApiValidationError {
  message: string;
  field?: string;
  location?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly validationErrors: readonly ApiValidationError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseValidationErrors(value: unknown): ApiValidationError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): ApiValidationError[] => {
    if (!isRecord(item) || typeof item['msg'] !== 'string') {
      return [];
    }

    return [{
      message: item['msg'],
      ...(typeof item['path'] === 'string' ? { field: item['path'] } : {}),
      ...(typeof item['location'] === 'string' ? { location: item['location'] } : {}),
    }];
  });
}

function getResponseMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  if (typeof body['error'] === 'string') {
    return body['error'];
  }

  if (typeof body['message'] === 'string') {
    return body['message'];
  }

  return undefined;
}

export function toApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      'network',
      0,
    );
  }

  const validationErrors = parseValidationErrors(
    isRecord(error.error) ? error.error['errors'] : undefined,
  );
  if (error.status === 400 && validationErrors.length > 0) {
    return new ApiError(
      'The request contains invalid fields.',
      'validation',
      error.status,
      validationErrors,
    );
  }

  const message = getResponseMessage(error.error) ?? error.statusText;
  if (error.status === 401) {
    return new ApiError(message || 'Authentication is required.', 'unauthorized', error.status);
  }
  if (error.status === 403) {
    return new ApiError(message || 'You do not have permission to perform this action.', 'forbidden', error.status);
  }
  if (error.status === 404) {
    return new ApiError(message || 'The requested resource was not found.', 'not-found', error.status);
  }
  if (error.status >= 500) {
    return new ApiError(message || 'The server could not complete the request.', 'server', error.status);
  }

  return new ApiError(message || 'The request could not be completed.', 'http', error.status);
}
