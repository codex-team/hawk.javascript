import type { EventContext } from '@hawk.so/types';

/**
 * Per-issue threshold configuration.
 */
export interface IssueThresholdOptions {
  /**
   * Max allowed duration (ms). Emit issue when entry duration is >= this value.
   * Values below 50ms are clamped to 50ms.
   */
  thresholdMs?: number;
}

/**
 * Issues configuration.
 */
export interface IssuesOptions {
  /**
   * Enable automatic global errors handling.
   *
   * @default true
   */
  errors?: boolean;

  /**
   * Enable aggregated Web Vitals monitoring.
   *
   * @default false
   */
  webVitals?: boolean;

  /**
   * Long Tasks options. Set `false` to disable.
   *
   * @default false
   */
  longTasks?: false | IssueThresholdOptions;

  /**
   * Long Animation Frames options. Set `false` to disable.
   *
   * @default false
   */
  longAnimationFrames?: false | IssueThresholdOptions;
}

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

/**
 * Web Vitals rating level.
 */
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Single Web Vital metric.
 */
export interface WebVitalMetric {
  /** Metric name (`LCP`, `FCP`, `TTFB`, `INP`, `CLS`) */
  name: string;
  /** Current metric value */
  value: number;
  /** Computed rating for the metric */
  rating: WebVitalRating;
  /** Delta from the previous reported value */
  delta: number;
}

/**
 * Aggregated Web Vitals report.
 */
export interface WebVitalsReport {
  /** Human-readable summary of poor metrics */
  summary: string;
  /** Number of poor metrics in this report */
  poorCount: number;
  /** Full metrics map by metric name */
  metrics: Record<string, WebVitalMetric>;
}

/**
 * Payload sent by issues monitor to the catcher.
 */
export interface IssueEvent {
  title: string;
  context: EventContext;
}
