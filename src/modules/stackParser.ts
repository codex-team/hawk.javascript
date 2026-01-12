import type { StackFrame } from 'error-stack-parser';
import ErrorStackParser from 'error-stack-parser';
import type { BacktraceFrame, SourceCodeLine } from '@hawk.so/types';
import log from '../utils/log';
import fetchTimer from './fetchTimer';

/**
 * This module prepares parsed backtrace
 */
export default class StackParser {
  /**
   * Prevents loading one file several times
   * name -> content
   */
  private sourceFilesCache: {[fileName: string]: Promise<string>} = {};

  /**
   * Parse Error stack string and return useful information about an Error
   *
   * @param error - event from which to get backtrace
   */
  public async parse(error: Error): Promise<BacktraceFrame[]> {
    const stackParsed = ErrorStackParser.parse(error) as StackFrame[];

    return Promise.all(stackParsed.map(async (frame) => {
      const sourceCode = await this.extractSourceCode(frame);
      const file = frame.fileName !== null && frame.fileName !== undefined ? frame.fileName : '';
      const line = frame.lineNumber !== null && frame.lineNumber !== undefined ? frame.lineNumber : 0;

      return {
        file,
        line,
        column: frame.columnNumber,
        sourceCode: sourceCode !== null ? sourceCode : undefined,
        function: frame.functionName,
        arguments: frame.args,
      };
    }));
  }

  /**
   * Extract 5 lines below and above the error's line
   *
   * @param {StackFrame} frame — information about backtrace item
   */
  private async extractSourceCode(frame: StackFrame): Promise<SourceCodeLine[] | null> {
    const minifiedSourceCodeThreshold = 200;

    try {
      if (!frame.fileName) {
        return null;
      };

      if (!this.isValidUrl(frame.fileName)) {
        return null;
      }

      /**
       * If error occurred in large column number, the script probably minified
       * Skip minified bundles — they will be processed if user enabled source-maps tracking
       */
      if (frame.columnNumber && frame.columnNumber > minifiedSourceCodeThreshold) {
        return null;
      }

      const file = await this.loadSourceFile(frame.fileName);

      if (!file) {
        return null;
      }

      const lines = file.split('\n');
      const actualLineNumber = frame.lineNumber ? frame.lineNumber - 1 : 0;
      const linesCollectCount = 5;
      const lineFrom = Math.max(0, actualLineNumber - linesCollectCount);
      const lineTo = Math.min(lines.length - 1, actualLineNumber + linesCollectCount + 1);

      const sourceCodeLines: SourceCodeLine[] = [];
      let extractedLineIndex = 1;

      /**
       * In some cases column number of the error stack trace frame would be less then 200, but source code is minified
       * For this cases we need to check, that all of the lines to collect have length less than 200 too
       */
      lines.slice(lineFrom, lineTo).forEach((lineToCheck) => {
        if (lineToCheck.length > minifiedSourceCodeThreshold) {
          return null;
        } else {
          sourceCodeLines.push({
            line: lineFrom + extractedLineIndex,
            content: lineToCheck,
          });

          extractedLineIndex += 1;
        }
      });

      return sourceCodeLines;
    } catch (e) {
      console.warn('Hawk JS SDK: Can not extract source code. Please, report this issue: https://github.com/codex-team/hawk.javascript/issues/new', e);

      return null;
    }
  }

  /**
   * Check if string is a valid URL
   *
   * @param string - string with URL to check
   */
  private isValidUrl(string: string): boolean {
    try {
      return !!new URL(string);
    } catch (_) {
      return false;
    }
  }

  /**
   * Downloads source file
   *
   * @param {string} fileName - name of file to download
   */
  private async loadSourceFile(fileName): Promise<string | null> {
    if (this.sourceFilesCache[fileName] !== undefined) {
      return this.sourceFilesCache[fileName];
    }

    try {
      /**
       * Try to load source file.
       * Wait for maximum 2 sec to skip loading big files.
       */
      this.sourceFilesCache[fileName] = fetchTimer(fileName, 2000)
        .then((response) => response.text());

      /**
       * Dealloc cache when it collects more that 10 files
       */
      if (Object.keys(this.sourceFilesCache).length > 10) {
        const alone = this.sourceFilesCache[fileName];

        this.sourceFilesCache = {};
        this.sourceFilesCache[fileName] = alone;
      }

      return await this.sourceFilesCache[fileName];
    } catch (error) {
      log('Can not load source file. Skipping...');

      return null;
    }
  }
}
