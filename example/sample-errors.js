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
  Promise.resolve().then(realErrorSample).then(() => {});
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
const buttonGetUser = document.getElementById('btn-get-user');

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

buttonGetUser.addEventListener('click', () => {
  const currentUser = window.hawk.getCurrentUser();
  alert('Current user: ' + (currentUser ? JSON.stringify(currentUser, null, 2) : 'No user set'));
});

/**
 * Context Management
 */
const buttonSetContext = document.getElementById('btn-set-context');
const buttonClearContext = document.getElementById('btn-clear-context');
const buttonGetContext = document.getElementById('btn-get-context');

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

buttonClearContext.addEventListener('click', () => {
  window.hawk.clearContext();
});

buttonGetContext.addEventListener('click', () => {
  const currentContext = window.hawk.getCurrentContext();
  alert(
    'Current context: ' +
      (currentContext ? JSON.stringify(currentContext, null, 2) : 'No context set')
  );
});

/**
 * Test without user
 */
const buttonTestWithoutUser = document.getElementById('btn-test-without-user');

buttonTestWithoutUser.addEventListener('click', () => {
  // Clear user first to ensure no user is set
  window.hawk.clearUser();

  // Send error without user
  window.hawk.send(new Error('Test error without user'));
});
