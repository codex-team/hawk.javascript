import { BacktraceFrame } from '../../types/hawk-event';
/**
 * This module prepares parsed backtrace
 * @uses https://github.com/stacktracejs/error-stack-parser
 */
export default class StackParser {
    /**
     * Prevents loading one file several times
     * name -> content
     */
    private sourceFilesCache;
    /**
     * Parse Error stack string and return useful information about an Error
     */
    parse(error: Error): Promise<BacktraceFrame[]>;
    /**
     * Extract 5 lines below and above the error's line
     * @param {StackFrame} frame — information about backtrace item
     */
    private extractSourceCode;
    /**
     * Check if string is a valid URL
     */
    private isValidUrl;
    /**
     * Downloads source file
     * @param {string} fileName - name of file to download
     */
    private loadSourceFile;
}
