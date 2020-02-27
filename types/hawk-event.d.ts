/**
 * Hawk Event format
 *
 * @copyright CodeX
 */
export interface HawkEvent {
  /**
   * User project's Integration Token
   */
  token: string;

  /**
   * Hawk Catcher name
   */
  catcherType: string;

  /**
   * All information about the event
   */
  payload: EventData;
}

/**
 * Information about event
 * That object will be send as 'payload' to the Collector
 */
export interface EventData {
  /**
   * Event title
   */
  title: string;

  /**
   * Occurrence time
   * [!] Must be a Unix timestamp in seconds (example: 1567009247.576)
   */
  timestamp: number;

  /**
   * Stack
   * From the latest call to the earliest
   */
  backtrace?: BacktraceFrame[];

  /**
   * GET parameters
   */
  get?: object;

  /**
   * POST parameters
   */
  post?: object;

  /**
   * Headers map
   */
  headers?: object;

  /**
   * Current release (aka version, revision) of an application
   */
  release?: string;

  /**
   * Current authenticated user
   */
  user?: User;

  /**
   * Any other information to send with event
   */
  context?: object;

  /**
   * Some useful details
   */
  addons?: object;

  /**
   * User-Agent
   */
  userAgent?: string;
}

/**
 * Single item of backtrace
 */
export interface BacktraceFrame {
  /**
   * File
   */
  file: string;

  /**
   * Line number
   */
  line: number;

  /**
   * Column number
   */
  column: number;

  /**
   * Sibling source code lines: some above and some below
   */
  sourceCode?: SourceCodeLine[];

  /**
   * Function name extracted from current stack frame
   */
  function?: string;

  /**
   * Function arguments extracted from current stack frame
   */
  arguments?: string[];
}

/**
 * Representation of source code line,
 * Used in event.payload.backtrace[].sourceCode
 */
export interface SourceCodeLine {
  /**
   * Line number
   */
  line: number;

  /**
   * Line content
   */
  content: string;
}

/**
 * Represents User object
 */
export interface User {
  /**
   * Internal user's identifier inside an app
   */
  id: number;

  /**
   * User public name
   */
  name?: string;

  /**
   * URL for user's details page
   */
  url?: string;

  /**
   * User's public picture
   */
  image?: string;
}
