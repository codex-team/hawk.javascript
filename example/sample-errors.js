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
    contextSample.trim().length
      ? { contextSample }
      : undefined
  );
});
