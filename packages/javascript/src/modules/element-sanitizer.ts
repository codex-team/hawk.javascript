import { Sanitizer } from '@hawk.so/core';

/**
 * Registers browser-specific sanitizer handler for {@link Element} objects.
 *
 * Handles HTML Element and represents as string with it outer HTML with
 * inner content replaced: HTMLDivElement -> "<div ...></div>"
 */
Sanitizer.registerHandler({
  check: (target) => target instanceof Element,
  format: (target: Element) => {
    const innerHTML = target.innerHTML;

    if (innerHTML) {
      return target.outerHTML.replace(target.innerHTML, '…');
    }

    return target.outerHTML;
  },
});
