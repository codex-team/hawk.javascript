import { describe, it, expect } from 'vitest';
import { Sanitizer } from '@hawk.so/core';
import '../../src/modules/sanitizer';

describe('Browser Sanitizer handlers', () => {
  describe('Element handler', () => {
    it('should format an empty HTML element as its outer HTML', () => {
      const el = document.createElement('div');
      const result = Sanitizer.sanitize(el);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^<div/);
    });

    it('should replace inner HTML content with ellipsis', () => {
      const el = document.createElement('div');

      el.innerHTML = '<span>some long content</span>';

      const result = Sanitizer.sanitize(el);

      expect(result).toContain('…');
      expect(result).not.toContain('some long content');
    });
  });
});
