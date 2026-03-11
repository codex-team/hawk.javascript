import type { Json } from '@hawk.so/types';

/**
 * Per-issue threshold configuration.
 */
export interface PerformanceIssueThresholdOptions {
  /**
   * Max allowed duration (ms). Emit issue when entry duration is >= this value.
   * Values below 50ms are clamped to 50ms.
   */
  thresholdMs?: number;
}

/**
 * Performance issues configuration.
 */
export interface PerformanceIssuesOptions {
  /**
   * Enable aggregated Web Vitals monitoring.
   *
   * @default true
   */
  webVitals?: boolean;

  /**
   * Long Tasks options.
   * `false` disables the feature.
   * Any other value enables it with default threshold.
   * If `thresholdMs` is a valid number greater than or equal to 50, it is used.
   *
   * @default true
   */
  longTasks?: boolean | PerformanceIssueThresholdOptions;

  /**
   * Long Animation Frames options.
   * `false` disables the feature.
   * Any other value enables it with default threshold.
   * If `thresholdMs` is a valid number greater than or equal to 50, it is used.
   *
   * @default true
   */
  longAnimationFrames?: boolean | PerformanceIssueThresholdOptions;
}

/**
 * Full issues configuration.
 */
export interface IssuesOptions extends PerformanceIssuesOptions {
  /**
   * Enable automatic global errors handling.
   *
   * @default true
   */
  errors?: boolean;
}

/**
 * Long Task attribution from the Performance API (TaskAttributionTiming).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
 */
export interface LongTaskAttribution {
  /** Attribution source type (`self`, `same-origin-ancestor`, `cross-origin-descendant`, etc.) */
  name: string;
  /** Container type (`iframe`, `embed`, `object`) */
  containerType?: string;
  /** Source URL of the container element */
  containerSrc?: string;
  /** DOM id of the container element */
  containerId?: string;
  /** DOM name attribute of the container element */
  containerName?: string;
}

/**
 * PerformanceLongTaskTiming entry with attribution details.
 */
export interface LongTaskPerformanceEntry extends PerformanceEntry {
  attribution?: LongTaskAttribution[];
}

/**
 * PerformanceScriptTiming — script that contributed to a Long Animation Frame.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceScriptTiming
 */
export interface LoAFScript {
  /** How the script was called (e.g. `DOMWindow.onclick`, `TimerHandler:setTimeout`) */
  invoker?: string;
  /** Script entry point type (`event-listener`, `user-callback`, `resolve-promise`, etc.) */
  invokerType?: string;
  /** Source URL of the script */
  sourceURL?: string;
  /** Top-level function name at the entry point of the script execution */
  sourceFunctionName?: string;
  /** Character position in the source file */
  sourceCharPosition?: number;
  /** Script duration in milliseconds */
  duration: number;
  /** Start time relative to navigation start (ms) */
  startTime: number;
  /** When script compilation finished and execution began (ms) */
  executionStart?: number;
  /** Time spent in forced synchronous style/layout recalculations (ms) */
  forcedStyleAndLayoutDuration?: number;
  /** Time spent on synchronous pausing operations like alert() or sync XHR (ms) */
  pauseDuration?: number;
  /** Relationship of the script's container to the top-level document (`self`, `ancestor`, `descendant`) */
  windowAttribution?: string;
}

/**
 * PerformanceLongAnimationFrameTiming entry.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming
 */
export interface LoAFEntry extends PerformanceEntry {
  /** Total time the main thread was blocked from responding to high-priority tasks (ms) */
  blockingDuration?: number;
  /** Start time of the rendering cycle (ms) */
  renderStart?: number;
  /** When style and layout calculations began (ms) */
  styleAndLayoutStart?: number;
  /** Timestamp of the first UI event (click, keypress) queued during this frame (ms) */
  firstUIEventTimestamp?: number;
  /** Script timing entries that contributed to this frame */
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
  name: string;
  value: number;
  rating: WebVitalRating;
  delta: number;
  navigationType?: string;
}

/**
 * Addons payload shape for performance issue events.
 */
export interface PerformanceIssueAddons {
  'Long Task'?: Json;
  'Long Frame'?: Json;
  'Web Vitals'?: Json;
}

/**
 * Payload sent by issues monitor to the catcher.
 */
export interface PerformanceIssueEvent {
  /** Human-readable issue title shown in Hawk event list. */
  title: string;
  /** Structured addons payload attached to this issue event. */
  addons: PerformanceIssueAddons;
}
