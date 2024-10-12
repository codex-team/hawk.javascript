/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This class provides methods for preparing data to sending to Hawk
 * - trim long strings
 * - represent html elements like <div ...> as "<div>" instead of "{}"
 * - represent big objects as "<big object>"
 * - represent class as <class SomeClass> or <instance of SomeClass>
 */
export default class Sanitizer {
  /**
   * Maximum string length
   */
  private static readonly maxStringLen: number = 200;

  /**
   * If object in stringified JSON has more keys than this value,
   * it will be represented as "<big object>"
   */
  private static readonly maxObjectKeysCount: number = 20;

  /**
   * Maximum depth of context object
   */
  private static readonly maxDepth: number = 5;

  /**
   * Maximum length of context arrays
   */
  private static readonly maxArrayLength: number = 10;

  /**
   * Apply sanitizing for array/object/primitives
   *
   * @param data - any object to sanitize
   * @param depth - current depth of recursion
   */
  public static sanitize(data: any, depth = 0): any {
    /**
     * If value is an Array, apply sanitizing for each element
     */
    if (Sanitizer.isArray(data)) {
      return this.sanitizeArray(data, depth + 1);

      /**
       * If value is an Element, format it as string with outer HTML
       * HTMLDivElement -> "<div ...></div>"
       */
    } else if (Sanitizer.isElement(data)) {
      return Sanitizer.formatElement(data);

      /**
       * If values is a not-constructed class, it will be formatted as "<class SomeClass>"
       * class Editor {...} -> <class Editor>
       */
    } else if (Sanitizer.isClassPrototype(data)) {
      return Sanitizer.formatClassPrototype(data);

      /**
       * If values is a some class instance, it will be formatted as "<instance of SomeClass>"
       * new Editor() -> <instance of Editor>
       */
    } else if (Sanitizer.isClassInstance(data)) {
      return Sanitizer.formatClassInstance(data);

      /**
       * If values is an object, do recursive call
       */
    } else if (Sanitizer.isObject(data)) {
      return Sanitizer.sanitizeObject(data, depth + 1);

      /**
       * If values is a string, trim it for max-length
       */
    } else if (Sanitizer.isString(data)) {
      return Sanitizer.trimString(data);
    }

    /**
     * If values is a number, boolean and other primitive, leave as is
     */
    return data;
  }

  /**
   * Apply sanitizing for each element of the array
   *
   * @param arr - array to sanitize
   * @param depth - current depth of recursion
   */
  private static sanitizeArray(arr: any[], depth: number): any[] {
    /**
     * If the maximum length is reached, slice array to max length and add a placeholder
     */
    const length = arr.length;

    if (length > Sanitizer.maxArrayLength) {
      arr = arr.slice(0, Sanitizer.maxArrayLength);
      arr.push(`<${length - Sanitizer.maxArrayLength} more items...>`);
    }

    return arr.map((item: any) => {
      return Sanitizer.sanitize(item, depth);
    });
  }

  /**
   * Process object values recursive
   *
   * @param data - object to beautify
   * @param depth - current depth of recursion
   */
  private static sanitizeObject(data: { [key: string]: any }, depth: number): Record<string, any> | '<deep object>' | '<big object>' {
    /**
     * If the maximum depth is reached, return a placeholder
     */
    if (depth > Sanitizer.maxDepth) {
      return '<deep object>';
    }

    /**
     * If the object has more keys than the limit, return a placeholder
     */
    if (Object.keys(data).length > Sanitizer.maxObjectKeysCount) {
      return '<big object>';
    }

    const result: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = Sanitizer.sanitize(data[key], depth);
      }
    }

    return result;
  }

  /**
   * Check if passed variable is an object
   *
   * @param target - variable to check
   */
  private static isObject(target: any): boolean {
    return Sanitizer.typeOf(target) === 'object';
  }

  /**
   * Check if passed variable is an array
   *
   * @param target - variable to check
   */
  private static isArray(target: any): boolean {
    return Array.isArray(target);
  }

  /**
   * Check if passed variable is a not-constructed class
   *
   * @param target - variable to check
   */
  private static isClassPrototype(target: any): boolean {
    if (!target || !target.constructor) {
      return false;
    }

    /**
     * like
     * "function Function {
     *   [native code]
     * }"
     */
    const constructorStr = target.constructor.toString();

    return constructorStr.includes('[native code]') && constructorStr.includes('Function');
  }

  /**
   * Check if passed variable is a constructed class instance
   *
   * @param target - variable to check
   */
  private static isClassInstance(target: any): boolean {
    return target && target.constructor && (/^class \S+ {/).test(target.constructor.toString());
  }

  /**
   * Check if passed variable is a string
   *
   * @param target - variable to check
   */
  private static isString(target: any): boolean {
    return typeof target === 'string';
  }

  /**
   * Return string representation of the object type
   *
   * @param object - object to get type
   */
  private static typeOf(object: any): string {
    return Object.prototype.toString.call(object).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
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
   * Return name of a passed class
   *
   * @param target - not-constructed class
   */
  private static getClassNameByPrototype(target: any): string {
    return target.name;
  }

  /**
   * Return name of a class by an instance
   *
   * @param target - instance of some class
   */
  private static getClassNameByInstance(target: any): string {
    return Sanitizer.getClassNameByPrototype(target.constructor);
  }

  /**
   * Trim string if it reaches max length
   *
   * @param target - string to check
   */
  private static trimString(target: string): string {
    if (target.length > Sanitizer.maxStringLen) {
      return target.substr(0, Sanitizer.maxStringLen) + '…';
    }

    return target;
  }

  /**
   * Represent HTML Element as string with it outer-html
   * HTMLDivElement -> "<div ...></div>"
   *
   * @param target - variable to format
   */
  private static formatElement(target: Element): string {
    /**
     * Also, remove inner HTML because it can be BIG
     */
    const innerHTML = target.innerHTML;

    if (innerHTML) {
      return target.outerHTML.replace(target.innerHTML, '…');
    }

    return target.outerHTML;
  }

  /**
   * Represent not-constructed class as "<class SomeClass>"
   *
   * @param target - class to format
   */
  private static formatClassPrototype(target: any): string {
    const className = Sanitizer.getClassNameByPrototype(target);

    return `<instance of ${className}>`;
  }

  /**
   * Represent a some class instance as a "<instance of SomeClass>"
   *
   * @param target - class instance to format
   */
  private static formatClassInstance(target: any): string {
    const className = Sanitizer.getClassNameByInstance(target);

    return `<class ${className}>`;
  }
}
