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
  // Promise.reject('This is a sample rejected promise');
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
const buttonTestFetch = document.getElementById('btn-test-fetch-breadcrumb');
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

  window.hawk.addBreadcrumb({
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
  const breadcrumbs = window.hawk.getBreadcrumbs();

  if (breadcrumbs.length === 0) {
    breadcrumbsOutput.textContent = 'No breadcrumbs yet';
    return;
  }

  breadcrumbsOutput.textContent = JSON.stringify(breadcrumbs, null, 2);
});

buttonClearBreadcrumbs.addEventListener('click', () => {
  window.hawk.clearBreadcrumbs();
  breadcrumbsOutput.textContent = '✓ Breadcrumbs cleared';
});

buttonTestFetch.addEventListener('click', async () => {
  breadcrumbsOutput.textContent = 'Testing fetch breadcrumb...';

  try {
    const response = await fetch('https://api.github.com/zen');
    const text = await response.text();
    breadcrumbsOutput.textContent = `✓ Fetch completed (${response.status}): "${text}". Check breadcrumbs!`;
  } catch (error) {
    breadcrumbsOutput.textContent = `✗ Fetch failed: ${error.message}`;
  }
});
