import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makePayload } from './message-processor.helpers';
import { BrowserBreadcrumbsMessageProcessor } from '../../src/messages/browser-breadcrumbs-message-processor';
import { BrowserBreadcrumbStore } from '../../src/addons/breadcrumbs';

describe('BreadcrumbsMessageProcessor', () => {
  const processor = new BrowserBreadcrumbsMessageProcessor();

  beforeEach(() => {
    BrowserBreadcrumbStore.getInstance().clear()
  });

  it('should attach breadcrumbs from snapshot to payload', () => {
    const breadcrumbs = { message: 'click', timestamp: 1 };
    BrowserBreadcrumbStore.getInstance().add(breadcrumbs)

    const result = processor.apply(makePayload());

    expect(result?.breadcrumbs).toHaveLength(1)
    expect(result?.breadcrumbs).toContainEqual(breadcrumbs);
  });

  it('should not set payload breadcrumbs when breadcrumb store is empty', () => {
    const result = processor.apply(makePayload());

    expect(result?.breadcrumbs).toBeUndefined();
  });
});
