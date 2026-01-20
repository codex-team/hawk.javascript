/**
 * Real error sample
 */
function realErrorSample() {
  /**
   * Error wrapper used to fill stack
   */
  function errorWrapperForStack(initialValue) {
    const a = 1;

    a = initialValue;
  }

  errorWrapperForStack(2);
}

/**
 * Calling function that has syntax error;
 */
const buttonRealError = document.getElementById('btn-real-error');

buttonRealError.addEventListener('click', realErrorSample);

/**
 * Unhandled promise rejection
 */
const buttonPromiseRejection = document.getElementById('btn-promise-rejection');

buttonPromiseRejection.addEventListener('click', function promiseRejectionSample() {
  /**
   * Promise.reject('This is a sample rejected promise');
   */
  Promise.resolve()
    .then(realErrorSample)
    .then(() => {});
});

/**
 * Send many errors
 */
const buttonSendMany = document.getElementById('btn-send-many');

buttonSendMany.addEventListener('click', function sendManyErrors() {
  const inputElement = document.getElementById('errorsNumber');
  const errorType = document.getElementById('errorType').value;
  const errorsNumber = inputElement.value;

  for (let i = 0; i < errorsNumber; i++) {
    window.hawk.send(new window[errorType]('Test many error'));
  }
});

/**
 * Console watcher test
 */
const buttonConsoleTest = document.getElementById('btn-console-test');

buttonConsoleTest.addEventListener('click', function consoleLogPrint() {
  const consoleMethod = document.getElementById('consoleMethod').value;
  const text = document.getElementById('consoleCatcherTestTextInput').value;

  console[consoleMethod](text);
});

/**
 * Button for the manual sending
 */
const buttonManualSending = document.getElementById('btn-manual-sending');

buttonManualSending.addEventListener('click', () => {
  const contextSample = document.getElementById('errorContext').value;

  window.hawk.send(
    new Error('Manual sending example'),
    contextSample.trim().length ? { contextSample } : undefined
  );
});

/**
 * User Management
 */
const buttonSetUser = document.getElementById('btn-set-user');
const buttonClearUser = document.getElementById('btn-clear-user');

buttonSetUser.addEventListener('click', () => {
  const userId = document.getElementById('userId').value;
  const userName = document.getElementById('userName').value;
  const userUrl = document.getElementById('userUrl').value;

  if (!userId.trim()) {
    alert('User ID is required');
    return;
  }

  const user = {
    id: userId,
    ...(userName.trim() && { name: userName }),
    ...(userUrl.trim() && { url: userUrl }),
  };

  window.hawk.setUser(user);
});

buttonClearUser.addEventListener('click', () => {
  window.hawk.clearUser();
});

/**
 * Context Management
 */
const buttonSetContext = document.getElementById('btn-set-context');

buttonSetContext.addEventListener('click', () => {
  const contextKey = document.getElementById('contextKey').value;
  const contextValue = document.getElementById('contextValue').value;

  if (!contextKey.trim()) {
    alert('Context key is required');
    return;
  }

  const context = {
    [contextKey]: contextValue,
  };

  window.hawk.setContext(context);
});

/**
 * Breadcrumbs Management
 */
const buttonAddBreadcrumb = document.getElementById('btn-add-breadcrumb');
const buttonGetBreadcrumbs = document.getElementById('btn-get-breadcrumbs');
const buttonClearBreadcrumbs = document.getElementById('btn-clear-breadcrumbs');
const breadcrumbsOutput = document.getElementById('breadcrumbs-output');

buttonAddBreadcrumb.addEventListener('click', () => {
  const message = document.getElementById('breadcrumbMessage').value;
  const type = document.getElementById('breadcrumbType').value;
  const level = document.getElementById('breadcrumbLevel').value;
  const category = document.getElementById('breadcrumbCategory').value;

  if (!message.trim()) {
    alert('Breadcrumb message is required');
    return;
  }

  window.hawk.breadcrumbs.add({
    message,
    type,
    level,
    ...(category.trim() && { category }),
    data: {
      timestamp: new Date().toISOString(),
      custom: 'manual breadcrumb',
    },
  });

  breadcrumbsOutput.textContent = `✓ Breadcrumb added: ${message}`;
});

buttonGetBreadcrumbs.addEventListener('click', () => {
  const breadcrumbs = window.hawk.breadcrumbs.get();

  if (breadcrumbs.length === 0) {
    breadcrumbsOutput.textContent = 'No breadcrumbs yet';
    return;
  }

  breadcrumbsOutput.textContent = JSON.stringify(breadcrumbs, null, 2);
});

buttonClearBreadcrumbs.addEventListener('click', () => {
  window.hawk.breadcrumbs.clear();
  breadcrumbsOutput.textContent = '✓ Breadcrumbs cleared';
});

/**
 * Test All Breadcrumb Types
 */
const buttonTestDefault = document.getElementById('btn-test-default');
const buttonTestRequest = document.getElementById('btn-test-request');
const buttonTestUI = document.getElementById('btn-test-ui');
const buttonTestNavigation = document.getElementById('btn-test-navigation');
const buttonTestLogic = document.getElementById('btn-test-logic');
const buttonTestError = document.getElementById('btn-test-error');
const buttonTestAllTypes = document.getElementById('btn-test-all-types');

/**
 * Test Default breadcrumb
 */
buttonTestDefault.addEventListener('click', () => {
  window.hawk.breadcrumbs.add({
    type: 'default',
    level: 'info',
    category: 'user.action',
    message: 'User clicked on default event button',
    data: {
      action: 'button_click',
      context: 'breadcrumb_testing',
    },
  });
  breadcrumbsOutput.textContent = '✓ Default breadcrumb added';
});

/**
 * Test Request breadcrumb (automatic via fetch)
 */
buttonTestRequest.addEventListener('click', async () => {
  breadcrumbsOutput.textContent = 'Testing request breadcrumb...';

  try {
    const response = await fetch('https://api.github.com/zen');
    const text = await response.text();
    breadcrumbsOutput.textContent = `✓ Request breadcrumb added (${response.status}): "${text}"`;
  } catch (error) {
    breadcrumbsOutput.textContent = `✗ Request failed: ${error.message}`;
  }
});

/**
 * Test UI breadcrumb
 */
buttonTestUI.addEventListener('click', () => {
  window.hawk.breadcrumbs.add({
    type: 'ui',
    level: 'info',
    category: 'ui.click',
    message: 'Click on test button#btn-test-ui',
    data: {
      selector: 'button#btn-test-ui',
      text: '👆 UI Click',
      tagName: 'BUTTON',
      coordinates: {
        x: 100,
        y: 200,
      },
    },
  });
  breadcrumbsOutput.textContent = '✓ UI Click breadcrumb added';
});

/**
 * Test Navigation breadcrumb
 */
buttonTestNavigation.addEventListener('click', () => {
  const currentUrl = window.location.href;
  const testUrl = currentUrl.split('#')[0] + '#breadcrumb-test-' + Date.now();

  window.hawk.breadcrumbs.add({
    type: 'navigation',
    level: 'info',
    category: 'navigation',
    message: `Navigated to ${testUrl}`,
    data: {
      from: currentUrl,
      to: testUrl,
      method: 'hash_change',
    },
  });

  /**
   * Actually change the hash to trigger real navigation breadcrumb too
   */
  window.location.hash = 'breadcrumb-test-' + Date.now();

  breadcrumbsOutput.textContent = '✓ Navigation breadcrumb added';
});

/**
 * Test Logic breadcrumb
 */
buttonTestLogic.addEventListener('click', () => {
  /**
   * Simulate some logic operations
   */
  const startTime = performance.now();

  /**
   * Complex calculation for testing
   *
   * @param {number} n - Number of iterations
   * @returns {number} Calculation result
   */
  function complexCalculation(n) {
    let result = 0;

    for (let i = 0; i < n; i++) {
      result += Math.sqrt(i);
    }

    return result;
  }

  const result = complexCalculation(10000);
  const duration = performance.now() - startTime;

  window.hawk.breadcrumbs.add({
    type: 'logic',
    level: 'debug',
    category: 'calculation.complex',
    message: 'Performed complex calculation',
    data: {
      operation: 'complexCalculation',
      iterations: 10000,
      result: result,
      durationMs: duration.toFixed(2),
    },
  });

  breadcrumbsOutput.textContent = `✓ Logic breadcrumb added (${duration.toFixed(2)}ms)`;
});

/**
 * Test Error breadcrumb
 */
buttonTestError.addEventListener('click', () => {
  try {
    /**
     * Intentionally cause an error but catch it
     */
    JSON.parse('invalid json {{{');
  } catch (error) {
    window.hawk.breadcrumbs.add({
      type: 'error',
      level: 'error',
      category: 'json.parse',
      message: `JSON parse error: ${error.message}`,
      data: {
        error: error.name,
        message: error.message,
        input: 'invalid json {{{',
      },
    });

    breadcrumbsOutput.textContent = `✓ Error breadcrumb added: ${error.message}`;
  }
});

/**
 * Test All Types in sequence
 */
buttonTestAllTypes.addEventListener('click', async () => {
  breadcrumbsOutput.textContent = 'Running all breadcrumb types...';

  /**
   * 1. Default
   */
  window.hawk.breadcrumbs.add({
    type: 'default',
    level: 'info',
    message: 'Sequence started',
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 2. Logic
   */
  window.hawk.breadcrumbs.add({
    type: 'logic',
    level: 'debug',
    category: 'sequence.step',
    message: 'Processing step 1',
    data: {
      step: 1,
    },
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 3. UI
   */
  window.hawk.breadcrumbs.add({
    type: 'ui',
    level: 'info',
    category: 'ui.interaction',
    message: 'User initiated sequence',
    data: {
      action: 'sequence_test',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 4. Request
   */
  try {
    await fetch('https://api.github.com/zen');
  } catch (error) {
    /**
     * Fetch will be captured automatically
     */
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 5. Navigation
   */
  window.hawk.breadcrumbs.add({
    type: 'navigation',
    level: 'info',
    message: 'Internal route change',
    data: {
      route: '/test',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 6. Error
   */
  try {
    throw new Error('Test error in sequence');
  } catch (error) {
    window.hawk.breadcrumbs.add({
      type: 'error',
      level: 'warning',
      message: `Caught error: ${error.message}`,
      data: {
        error: error.name,
      },
    });
  }

  breadcrumbsOutput.textContent = '✓ All breadcrumb types added! Check "Get Breadcrumbs"';
});
