/* eslint-disable @typescript-eslint/no-explicit-any */
import { isPlainObject } from '../utils/validation';

/**
 * This class provides methods for preparing data to sending to Hawk
 * - trim long strings
 * - represent big objects as "<big object>"
 * - represent class as <class SomeClass> or <instance of SomeClass>
 */
export class Sanitizer {
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
   * @param seen - Set of already seen objects to prevent circular references
   */
  public static sanitize(data: any, depth = 0, seen = new WeakSet<object>()): any {
    /**
     * Check for circular references on objects and arrays
     */
    if (data !== null && typeof data === 'object') {
      if (seen.has(data)) {
        return '<circular>';
      }
      seen.add(data);
    }

    /**
     * If value is an Array, apply sanitizing for each element
     */
    if (Sanitizer.isArray(data)) {
      return this.sanitizeArray(data, depth + 1, seen);
    }

    const formattedData = Sanitizer.format(data);
    if (formattedData) {
      return formattedData;
    }

    /**
     * If values is an object, do recursive call
     */
    if (Sanitizer.isObject(data)) {
      return Sanitizer.sanitizeObject(data, depth + 1, seen);
    }

    /**
     * If values is a string, trim it for max-length
     */
    if (Sanitizer.isString(data)) {
      return Sanitizer.trimString(data);
    }

    /**
     * If values is a number, boolean and other primitive, leave as is
     */
    return data;
  }


  public static format(data: any): any {
    /**
     * If values is a not-constructed class, it will be formatted as "<class SomeClass>"
     * class Editor {...} -> <class Editor>
     */
    if (Sanitizer.isClassPrototype(data)) {
      return Sanitizer.formatClassPrototype(data);
    }
    /**
     * If values is a some class instance, it will be formatted as "<instance of SomeClass>"
     * new Editor() -> <instance of Editor>
     */
    if (Sanitizer.isClassInstance(data)) {
      return Sanitizer.formatClassInstance(data);
    }
    return null;
  }

  /**
   * Check if passed variable is an object
   *
   * @param target - variable to check
   */
  public static isObject(target: any): boolean {
    return isPlainObject(target);
  }

  /**
   * Apply sanitizing for each element of the array
   *
   * @param arr - array to sanitize
   * @param depth - current depth of recursion
   * @param seen - Set of already seen objects to prevent circular references
   */
  private static sanitizeArray(arr: any[], depth: number, seen: WeakSet<object>): any[] {
    /**
     * If the maximum length is reached, slice array to max length and add a placeholder
     */
    const length = arr.length;

    if (length > Sanitizer.maxArrayLength) {
      arr = arr.slice(0, Sanitizer.maxArrayLength);
      arr.push(`<${length - Sanitizer.maxArrayLength} more items...>`);
    }

    return arr.map((item: any) => {
      return Sanitizer.sanitize(item, depth, seen);
    });
  }

  /**
   * Process object values recursive
   *
   * @param data - object to beautify
   * @param depth - current depth of recursion
   * @param seen - Set of already seen objects to prevent circular references
   */
  private static sanitizeObject(data: {
    [key: string]: any
  }, depth: number, seen: WeakSet<object>): Record<string, any> | '<deep object>' | '<big object>' {
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
        result[key] = Sanitizer.sanitize(data[key], depth, seen);
      }
    }

    return result;
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
      return target.substring(0, Sanitizer.maxStringLen) + '…';
    }

    return target;
  }

  /**
   * Represent not-constructed class as "<class SomeClass>"
   *
   * @param target - class to format
   */
  private static formatClassPrototype(target: any): string {
    const className = Sanitizer.getClassNameByPrototype(target);

    return `<class ${className}>`;
  }

  /**
   * Represent a some class instance as a "<instance of SomeClass>"
   *
   * @param target - class instance to format
   */
  private static formatClassInstance(target: any): string {
    const className = Sanitizer.getClassNameByInstance(target);

    return `<instance of ${className}>`;
  }
}
