/**
 * beforeSend tests
 *
 * Three core scenarios:
 * 1. Return modified event → event is sent with changes
 * 2. Return false → event is dropped, nothing is sent
 * 3. Return nothing (undefined) → original event is sent, warning in console
 */
const bsOutput = document.getElementById('before-send-output');

document.getElementById('btn-bs-modify').addEventListener('click', () => {
  bsOutput.textContent = '';

  const hawk = new window.HawkCatcher({
    token: window.HAWK_TOKEN,
    disableGlobalErrorsHandling: true,
    beforeSend(event) {
      event.context = { sanitized: true };

      return event;
    },
  });

  hawk.send(new Error('beforeSend: modify test'));

  bsOutput.textContent =
    'Expected: event sent with context.sanitized = true\n'
    + 'Check: DevTools → Network tab, outgoing WebSocket message should contain "sanitized"';
});

document.getElementById('btn-bs-drop').addEventListener('click', () => {
  bsOutput.textContent = '';

  const hawk = new window.HawkCatcher({
    token: window.HAWK_TOKEN,
    disableGlobalErrorsHandling: true,
    beforeSend() {
      return false;
    },
  });

  hawk.send(new Error('beforeSend: drop test'));

  bsOutput.textContent =
    'Expected: event NOT sent (dropped by beforeSend)\n'
    + 'Check: DevTools → Network tab, no new WebSocket message should appear';
});

document.getElementById('btn-bs-void').addEventListener('click', () => {
  bsOutput.textContent = '';

  const hawk = new window.HawkCatcher({
    token: window.HAWK_TOKEN,
    disableGlobalErrorsHandling: true,
    beforeSend() {
      /* no return */
    },
  });

  hawk.send(new Error('beforeSend: void test'));

  bsOutput.textContent =
    'Expected: original event sent as-is, warning logged\n'
    + 'Check: DevTools → Console should show "[Hawk] Invalid beforeSend value: (undefined)..."';
});

/**
 * beforeBreadcrumb test
 *
 * BreadcrumbManager is a singleton — only the first init() takes effect.
 * We test all three scenarios in a single run with one beforeBreadcrumb
 * that handles each case based on the breadcrumb message.
 *
 * Messages:
 *  - "modify me"  → returns modified breadcrumb (message prefixed with "MODIFIED:")
 *  - "drop me"    → returns false (breadcrumb discarded)
 *  - "void me"    → returns undefined (original stored, warning in console)
 */
const bbcOutput = document.getElementById('before-bc-output');

document.getElementById('btn-bbc-run').addEventListener('click', () => {
  bbcOutput.textContent = 'Running...';

  const hawk = new window.HawkCatcher({
    token: window.HAWK_TOKEN,
    disableGlobalErrorsHandling: true,
    breadcrumbs: {
      trackFetch: false,
      trackNavigation: false,
      trackClicks: false,
      beforeBreadcrumb(bc) {
        if (bc.message === 'modify me') {
          bc.message = 'MODIFIED: ' + bc.message;

          return bc;
        }

        if (bc.message === 'drop me') {
          return false;
        }

        /* "void me" — no return */
      },
    },
  });

  hawk.breadcrumbs.clear();

  hawk.breadcrumbs.add({ type: 'logic', message: 'modify me', level: 'info' });
  hawk.breadcrumbs.add({ type: 'logic', message: 'drop me', level: 'info' });
  hawk.breadcrumbs.add({ type: 'logic', message: 'void me', level: 'info' });

  const crumbs = hawk.breadcrumbs.get();
  const messages = crumbs.map((c) => c.message);

  const modifyPass = messages.includes('MODIFIED: modify me');
  const dropPass = !messages.includes('drop me');
  const voidPass = messages.includes('void me');

  const lines = [
    `1. Modify:  ${modifyPass ? 'PASS' : 'FAIL'} — stored "${messages.find((m) => m.startsWith('MODIFIED:')) || '(not found)'}"`,
    `2. Drop:    ${dropPass ? 'PASS' : 'FAIL'} — "drop me" ${dropPass ? 'not in list' : 'still present'}`,
    `3. Void:    ${voidPass ? 'PASS' : 'FAIL'} — "void me" ${voidPass ? 'stored as-is' : 'missing'}`,
    '',
    'Console should show: [Hawk] beforeBreadcrumb returned nothing...',
    '',
    `All stored messages: ${JSON.stringify(messages)}`,
  ];

  bbcOutput.textContent = lines.join('\n');
});
