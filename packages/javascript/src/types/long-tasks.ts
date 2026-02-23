/**
 * Long Task attribution information from Performance API.
 * Describes the container associated with the long task.
 */
export interface LongTaskAttribution {
  /** Attribution source name (`self`, `same-origin-ancestor`, etc.) */
  name: string;
  /** Entry type name from the attribution object */
  entryType: string;
  /** Container type (`iframe`, `embed`, `object`) */
  containerType?: string;
  /** Source URL of the container */
  containerSrc?: string;
  /** DOM id of the container element */
  containerId?: string;
  /** DOM name of the container element */
  containerName?: string;
}

/**
 * Long Task entry with attribution details.
 */
export interface LongTaskPerformanceEntry extends PerformanceEntry {
  /** Attribution list for the long task */
  attribution?: LongTaskAttribution[];
}

/**
 * LoAF script timing information (PerformanceScriptTiming).
 */
export interface LoAFScript {
  /** Script display name */
  name: string;
  /** Script invoker (e.g. `TimerHandler:setTimeout`) */
  invoker?: string;
  /** Invoker type (`event-listener`, `user-callback`, etc.) */
  invokerType?: string;
  /** Source URL of the script */
  sourceURL?: string;
  /** Function name associated with the script execution */
  sourceFunctionName?: string;
  /** Character position in source */
  sourceCharPosition?: number;
  /** Script duration in milliseconds */
  duration: number;
  /** Start time in milliseconds from navigation start */
  startTime: number;
  /** Execution start timestamp */
  executionStart?: number;
  /** Forced style/layout duration in milliseconds */
  forcedStyleAndLayoutDuration?: number;
  /** Paused time in milliseconds */
  pauseDuration?: number;
  /** Window attribution (`self`, `ancestor`, `descendant`) */
  windowAttribution?: string;
}

/**
 * Long Animation Frame entry shape.
 */
export interface LoAFEntry extends PerformanceEntry {
  /** Blocking duration in milliseconds */
  blockingDuration?: number;
  /** Render start timestamp */
  renderStart?: number;
  /** Style/layout start timestamp */
  styleAndLayoutStart?: number;
  /** First UI event timestamp */
  firstUIEventTimestamp?: number;
  /** Script timing records for the frame */
  scripts?: LoAFScript[];
}
