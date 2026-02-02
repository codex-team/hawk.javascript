import type { Breadcrumb } from '@hawk.so/types';
import type { BreadcrumbInput, BreadcrumbHint } from '../addons/breadcrumbs';

/**
 * Breadcrumbs API interface
 */
export interface BreadcrumbsAPI {
  add: (breadcrumb: BreadcrumbInput, hint?: BreadcrumbHint) => void;
  get: () => Breadcrumb[];
  clear: () => void;
}
