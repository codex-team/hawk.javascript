require('regenerator-runtime/runtime');
const HawkCatcher = require('./catcher');

const consoleCatcher = require('./integrations/consoleCatcher');
const userAgentInfo = require('./integrations/userAgentInfo');
const eventFilter = require('./integrations/eventFilter');
const revision = require('./integrations/revision');

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
class HawkCatcherDefault extends HawkCatcher {
  /**
   * Creates catcher instance
   * @param {HawkCatcherDefaultSettings|string} settings - settings object or token
   */
  constructor(settings) {
    super(settings);

    this.integrations = [
      consoleCatcher,
      userAgentInfo,
      eventFilter,
      revision(settings.revision)
    ];
  }
}

module.exports = HawkCatcherDefault;
