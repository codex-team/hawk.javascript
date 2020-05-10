/**
 * Logger module
 *
 * @example
 * log('We got an error', 'error')
 */
/**
 * Custom logger
 *
 * @param {string} msg  - message
 * @param {string} type - logging type 'log'|'warn'|'error'|'info'
 * @param {*} [args]      - argument to log with a message
 * @param {string} style  - additional styling to message
 */
export default function log(msg: string, type?: string, args?: any, style?: string): void;
