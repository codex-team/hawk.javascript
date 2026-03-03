import type { Breadcrumb } from '@hawk.so/types';

/**
 * Hint passed to beforeBreadcrumb callback.
 */
export interface BreadcrumbHint {
  [key: string]: unknown;
}

/**
 * Breadcrumb with optional timestamp — the store fills it with Date.now() if omitted.
 */
export type BreadcrumbInput = Omit<Breadcrumb, 'timestamp'> & { timestamp?: number };

/**
 * Contract for breadcrumb storage — implemented by platform-specific stores (e.g. BrowserBreadcrumbStore).
 * Also serves as the public API exposed on the catcher instance via catcher.breadcrumbs.
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
