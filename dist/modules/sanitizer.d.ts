/**
 * This class provides methods for preparing data to sending to Hawk
 * - trim long strings
 * - represent html elements like <div ...> as "<div>" instead of "{}"
 * - represent big objects as "<big object>"
 * - represent class as <class SomeClass> or <instance of SomeClass>
 */
export default class Sanitizer {
    /**
     * Process object values recursive
     * @param data - object to beautify
     */
    static sanitizeObject(data: {
        [key: string]: any;
    }): object;
    /**
     * Maximum string length
     */
    private static readonly maxStringLen;
    /**
     * Maximum object length in JSON
     */
    private static readonly maxObjectLen;
    /**
     * Check if passed variable is an object
     * @param target - variable to check
     */
    private static isObject;
    /**
     * Check if passed variable is a not-constructed class
     * @param target - variable to check
     */
    private static isClassPrototype;
    /**
     * Check if passed variable is a constructed class instance
     * @param target - variable to check
     */
    private static isClassInstance;
    /**
     * Check if passed variable is a string
     * @param target - variable to check
     */
    private static isString;
    /**
     * Check if passed variable is an HTML Element
     * @param target - variable to check
     */
    private static isElement;
    /**
     * Check if passed object is too bif for sending
     * @param target - object to check
     */
    private static isBigObject;
    /**
     * Return name of a passed class
     * @param target - not-constructed class
     */
    private static getClassNameByPrototype;
    /**
     * Return name of a class by an instance
     * @param target - instance of some class
     */
    private static getClassNameByInstance;
    /**
     * Trim string if it reaches max length
     * @param target - string to check
     */
    private static trimString;
    /**
     * Represent HTML Element as string with it outer-html
     * HTMLDivElement -> "<div ...></div>"
     *
     * @param target - variable to format
     */
    private static formatElement;
    /**
     * Represent not-constructed class as "<class SomeClass>"
     * @param target - class to format
     */
    private static formatClassPrototype;
    /**
     * Represent a some class instance as a "<instance of SomeClass>"
     * @param target - class instance to format
     */
    private static formatClassInstance;
    /**
     * Represent big object as a "<big object>"
     * @param target - object ot format
     */
    private static formatBigObject;
}