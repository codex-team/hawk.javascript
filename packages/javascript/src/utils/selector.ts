/**
 * Build a simple CSS selector from an HTML element
 *
 * @param element - HTML element to build selector from
 * @returns CSS selector string (e.g., "div#myId.class1.class2")
 */
export function buildElementSelector(element: HTMLElement): string {
  let selector = element.tagName.toLowerCase();

  if (element.id) {
    selector += `#${element.id}`;
  } else if (element.className && typeof element.className === 'string') {
    selector += `.${element.className.split(' ').filter(Boolean).join('.')}`;
  }

  return selector;
}
