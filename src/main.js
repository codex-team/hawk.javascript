import 'regenerator-runtime/runtime';
import HawkCatcher from './catcher';
import consoleCatcher from './integrations/consoleCatcher';
import userAgentInfo from './integrations/userAgentInfo';
import eventFilter from './integrations/eventFilter';
import revision from './integrations/revision';
import stackParser from './integrations/stackParser';

/**
 * @typedef {Object} HawkCatcherDefaultSettings
 * @property {string} token - personal token
 * @property {string} host - optional: Hawk collector hostname
 * @property {Number} port - optional: Hawk collector port
 * @property {string} path - Hawk collector route for websocket connection
 * @property {Boolean} secure - pass FALSE to disable secure connection
 * @property {string} revision - identifier of bundle's revision
 */

/**
 * Hawk Catcher class with default setup
 */
export default class HawkCatcherDefault extends HawkCatcher {
  /**
   * Creates catcher instance
   * @param {HawkCatcherDefaultSettings|string} settings - settings object or token
   */
  constructor(settings) {
    super(settings);

    this.integrations = [
      // consoleCatcher,
      userAgentInfo,
      eventFilter,
      revision(settings.revision),
      stackParser,
    ];
  }
}