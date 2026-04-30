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
 * Test Default breadcrumb (manual)
 */
buttonTestDefault.addEventListener('click', () => {
  /**
   * Default breadcrumbs are always added manually via hawk.breadcrumbs.add()
   */
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
  breadcrumbsOutput.textContent = '✓ Default breadcrumb added manually';
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
 * Test UI breadcrumb (automatic tracking)
 */
buttonTestUI.addEventListener('click', () => {
  /**
   * Create a test element and click it to trigger automatic UI breadcrumb
   * BreadcrumbManager automatically captures click events when trackClicks: true
   */
  const testElement = document.createElement('button');

  testElement.id = 'auto-click-test';
  testElement.className = 'test-button';
  testElement.textContent = 'Auto Test';
  testElement.style.position = 'absolute';
  testElement.style.opacity = '0';
  testElement.style.pointerEvents = 'none';
  document.body.appendChild(testElement);

  /**
   * Trigger a click event
   */
  testElement.click();

  /**
   * Clean up
   */
  setTimeout(() => {
    document.body.removeChild(testElement);
  }, 100);

  breadcrumbsOutput.textContent = '✓ UI Click breadcrumb added automatically';
});

/**
 * Test Navigation breadcrumb (automatic tracking)
 */
buttonTestNavigation.addEventListener('click', () => {
  /**
   * Change the hash to trigger automatic navigation breadcrumb
   * BreadcrumbManager automatically captures this event
   */
  window.location.hash = 'breadcrumb-test-' + Date.now();

  breadcrumbsOutput.textContent = '✓ Navigation breadcrumb added automatically';
});

/**
 * Test Logic breadcrumb (manual)
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

  /**
   * Logic breadcrumbs are always added manually to track application flow
   */
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

  breadcrumbsOutput.textContent = `✓ Logic breadcrumb added manually (${duration.toFixed(2)}ms)`;
});

/**
 * Test Error breadcrumb (manual)
 */
buttonTestError.addEventListener('click', () => {
  try {
    /**
     * Intentionally cause an error but catch it
     */
    JSON.parse('invalid json {{{');
  } catch (error) {
    /**
     * Caught errors can be manually added as breadcrumbs
     * Uncaught errors are sent to Hawk automatically, not as breadcrumbs
     */
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

    breadcrumbsOutput.textContent = `✓ Error breadcrumb added manually: ${error.message}`;
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
   * 3. UI (automatic)
   */
  const autoClickElement = document.createElement('button');

  autoClickElement.id = 'sequence-auto-click';
  autoClickElement.style.position = 'absolute';
  autoClickElement.style.opacity = '0';
  autoClickElement.style.pointerEvents = 'none';
  document.body.appendChild(autoClickElement);
  autoClickElement.click();
  document.body.removeChild(autoClickElement);

  await new Promise(resolve => setTimeout(resolve, 200));

  /**
   * 4. Request (automatic)
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
   * 5. Navigation (automatic)
   */
  window.location.hash = 'sequence-test-' + Date.now();

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
