/**
 * @hawk.so/core
 *
 * Core utilities for Hawk.so error tracking SDKs
 * Environment-agnostic code that can be used in browser and server environments
 */

export { EventRejectedError } from './errors';
export { default as Sanitizer } from './modules/sanitizer';
export { isErrorProcessed, markErrorAsProcessed } from './utils/event';
export { validateUser, validateContext } from './utils/validation';
export { default as log } from './utils/log';
