/**
 * Build a simple CSS selector from an HTML element
 * If element has no id or class, recursively builds selector from parent
 *
 * @param element - HTML element to build selector from
 * @param maxDepth - Maximum recursion depth (default: 3)
 * @returns CSS selector string (e.g., "div#myId.class1.class2" or ".some-parent button")
 */
export function buildElementSelector(element: HTMLElement, maxDepth: number = 3): string {
  let selector = element.tagName.toLowerCase();

  if (element.id) {
    selector += `#${element.id}`;
    return selector;
  }

  if (element.className) {
    selector += `.${element.className.split(' ').filter(Boolean).join('.')}`;
    return selector;
  }

  /**
   * If element has no id or class, try to build selector from parent
   */
  if (maxDepth > 0 && element.parentElement) {
    const parentSelector = buildElementSelector(element.parentElement as HTMLElement, maxDepth - 1);

    return `${parentSelector} ${selector}`;
  }

  return selector;
}
