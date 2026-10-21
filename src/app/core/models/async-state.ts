import { ApiError } from '../http/api-error';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; value: T }
  | { status: 'error'; error: ApiError };
