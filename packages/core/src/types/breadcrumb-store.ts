import type { Breadcrumb } from '@hawk.so/types';

/**
 * Hint passed to beforeBreadcrumb callback.
 */
export interface BreadcrumbHint {
  [key: string]: unknown;
}

/**
 * Breadcrumb input type - breadcrumb data with optional timestamp.
 */
export type BreadcrumbInput = Omit<Breadcrumb, 'timestamp'> & { timestamp?: number };

/**
 * Contract for breadcrumb storage. Also serves as public breadcrumbs API.
 */
export interface BreadcrumbStore {
  add(breadcrumb: BreadcrumbInput, hint?: BreadcrumbHint): void;
  get(): Breadcrumb[];
  clear(): void;
}

/**
 * @deprecated Use {@link BreadcrumbStore} instead.
 */
export type BreadcrumbsAPI = BreadcrumbStore;
