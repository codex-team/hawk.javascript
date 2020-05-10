/**
 * @file Integration for adding User Agent info
 */

/**
 * @param event - event to modify
 * @param data - event data
 */
export default function (event, data): void {
  data.payload.userAgent = {
    name: window.navigator.userAgent,
    frame: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}
