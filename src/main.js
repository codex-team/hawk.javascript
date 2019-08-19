require('regenerator-runtime/runtime');
const HawkCatcher = require('./HawkCatcher');

const consoleCatcher = require('./integrations/consoleCatcher');
const userAgentInfo = require('./integrations/userAgentInfo');
const eventFilter = require('./integrations/eventFilter');
const revision = require('./integrations/revision');

/**
 * Hawk Catcher class with default setup
 */
class HawkCatcherDefault extends HawkCatcher {
  constructor(settings) {
    super(settings);

    this.use(consoleCatcher);
    this.use(userAgentInfo);
    this.use(eventFilter);
    this.use(revision(settings.revision));
  }
}

module.exports = HawkCatcherDefault;
