import ErrorStackParser, { StackFrame } from 'error-stack-parser';
import { BacktraceFrame, SourceCodeLine } from '@hawk.so/types';
import log from './logger';
import fetchTimer from './fetchTimer';

/**
 * This module prepares parsed backtrace
 *
 * @requires https://github.com/stacktracejs/error-stack-parser
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
      return {
        file: frame.fileName,
        line: frame.lineNumber,
        column: frame.columnNumber,
        sourceCode: await this.extractSourceCode(frame),
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
  private async extractSourceCode(frame: StackFrame): Promise<SourceCodeLine[]> {
    try {
      if (!this.isValidUrl(frame.fileName)) {
        return null;
      }

      /**
       * If error occurred in large column number, the script probably minified
       * Skip minified bundles — they will be processed if user enabled source-maps tracking
       */
      if (frame.columnNumber > 200) {
        return null;
      }

      const file = await this.loadSourceFile(frame.fileName);

      if (!file) {
        return null;
      }

      const lines = file.split('\n');
      const actualLineNumber = frame.lineNumber - 1; // starts from 0;
      const linesCollectCount = 5;
      const lineFrom = Math.max(0, actualLineNumber - linesCollectCount);
      const lineTo = Math.min(lines.length - 1, actualLineNumber + linesCollectCount + 1);
      const linesToCollect = lines.slice(lineFrom, lineTo);

      return linesToCollect.map((content, index) => {
        return {
          line: lineFrom + index + 1,
          content,
        };
      });
    } catch (e) {
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
  private async loadSourceFile(fileName): Promise<string> {
    if (this.sourceFilesCache[fileName]) {
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
