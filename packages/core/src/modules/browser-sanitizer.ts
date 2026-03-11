import { Sanitizer } from "./sanitizer";

export class BrowserSanitizer extends Sanitizer {
  public static format(data: any): any {
    /**
     * If value is an Element, format it as string with outer HTML
     * HTMLDivElement -> "<div ...></div>"
     */
    if (this.isElement(data)) {
      return this.formatElement(data);
    }
    return super.format(data);
  }

  /**
   * Check if passed variable is an HTML Element
   *
   * @param target - variable to check
   */
  private static isElement(target: any): boolean {
    return target instanceof Element;
  }

  /**
   * Represent HTML Element as string with it outer-html
   * HTMLDivElement -> "<div ...></div>"
   *
   * @param target - variable to format
   */
  private static formatElement(target: Element): string {
    // Also, remove inner HTML because it can be BIG
    const innerHTML = target.innerHTML;

    if (innerHTML) {
      return target.outerHTML.replace(target.innerHTML, '…');
    }

    return target.outerHTML;
  }

}
