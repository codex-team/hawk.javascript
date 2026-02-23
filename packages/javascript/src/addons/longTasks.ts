/**
 * @file Long Task & Long Animation Frame (LoAF) tracking via PerformanceObserver
 *
 * Both APIs are Chromium-only (Chrome, Edge).
 * - Long Tasks: tasks blocking the main thread for >50 ms
 * - LoAF (Chrome 123+): richer attribution per long animation frame
 *
 * Sets up observers and fires `onEntry` per detected entry — fire and forget.
 */

import type { EventContext, Json, JsonNode } from '@hawk.so/types';
import log from '../utils/log';

/**
 * Configuration for main-thread blocking detection
 *
 * Both features are Chromium-only (Chrome, Edge).
 * Feature detection is performed automatically — on unsupported browsers
 * the observers simply won't start.
 */
export interface MainThreadBlockingOptions {
  /**
   * Track Long Tasks (tasks blocking the main thread for >50 ms).
   * Uses PerformanceObserver with `longtask` entry type.
   *
   * Chromium-only (Chrome, Edge)
   *
   * @default true
   */
  longTasks?: boolean;

  /**
   * Track Long Animation Frames (LoAF) — frames taking >50 ms.
   * Provides richer attribution data than Long Tasks.
   * Uses PerformanceObserver with `long-animation-frame` entry type.
   *
   * Chromium-only (Chrome 123+, Edge 123+)
   *
   * @default true
   */
  longAnimationFrames?: boolean;
}

/**
 * Payload passed to the callback when a long task / LoAF is detected
 */
export interface LongTaskEvent {
  title: string;
  context: EventContext;
}

/**
 * Long Task attribution (container-level info only)
 */
interface LongTaskAttribution {
  name: string;
  entryType: string;
  containerType?: string;
  containerSrc?: string;
  containerId?: string;
  containerName?: string;
}

/**
 * Long Task entry with attribution
 */
interface LongTaskPerformanceEntry extends PerformanceEntry {
  attribution?: LongTaskAttribution[];
}

/**
 * LoAF script timing (PerformanceScriptTiming)
 */
interface LoAFScript {
  name: string;
  invoker?: string;
  invokerType?: string;
  sourceURL?: string;
  sourceFunctionName?: string;
  sourceCharPosition?: number;
  duration: number;
  startTime: number;
  executionStart?: number;
  forcedStyleAndLayoutDuration?: number;
  pauseDuration?: number;
  windowAttribution?: string;
}

/**
 * LoAF entry shape (spec is still evolving)
 */
interface LoAFEntry extends PerformanceEntry {
  blockingDuration?: number;
  renderStart?: number;
  styleAndLayoutStart?: number;
  firstUIEventTimestamp?: number;
  scripts?: LoAFScript[];
}

/**
 * Build a Json object from entries, dropping null / undefined / empty-string values
 */
function compact(entries: [string, JsonNode | null | undefined][]): Json {
  const result: Json = {};

  for (const [key, value] of entries) {
    if (value != null && value !== '') {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Check whether the browser supports a given PerformanceObserver entry type
 *
 * @param type - entry type name, e.g. `'longtask'` or `'long-animation-frame'`
 */
function supportsEntryType(type: string): boolean {
  try {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes.includes(type)
    );
  } catch {
    return false;
  }
}

/**
 * Serialize a LoAF script entry into a Json-compatible object
 */
function serializeScript(s: LoAFScript): Json {
  return compact([
    ['invoker', s.invoker],
    ['invokerType', s.invokerType],
    ['sourceURL', s.sourceURL],
    ['sourceFunctionName', s.sourceFunctionName],
    ['sourceCharPosition', s.sourceCharPosition != null && s.sourceCharPosition >= 0 ? s.sourceCharPosition : null],
    ['duration', Math.round(s.duration)],
    ['executionStart', s.executionStart != null ? Math.round(s.executionStart) : null],
    ['forcedStyleAndLayoutDuration', s.forcedStyleAndLayoutDuration ? Math.round(s.forcedStyleAndLayoutDuration) : null],
    ['pauseDuration', s.pauseDuration ? Math.round(s.pauseDuration) : null],
    ['windowAttribution', s.windowAttribution],
  ]);
}

/**
 * Subscribe to Long Tasks (>50 ms) via PerformanceObserver
 *
 * @param onEntry - callback fired for each detected long task
 */
function observeLongTasks(onEntry: (e: LongTaskEvent) => void): void {
  if (!supportsEntryType('longtask')) {
    log('Long Tasks API is not supported in this browser', 'info');

    return;
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const task = entry as LongTaskPerformanceEntry;
        const durationMs = Math.round(task.duration);
        const attr = task.attribution?.[0];

        const details = compact([
          ['kind', 'longtask'],
          ['entryName', task.name],
          ['startTime', Math.round(task.startTime)],
          ['durationMs', durationMs],
          ['containerType', attr?.containerType],
          ['containerSrc', attr?.containerSrc],
          ['containerId', attr?.containerId],
          ['containerName', attr?.containerName],
        ]);

        onEntry({
          title: `Long Task ${durationMs} ms`,
          context: { mainThreadBlocking: details },
        });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* unsupported — ignore */ }
}

/**
 * Subscribe to Long Animation Frames (>50 ms) via PerformanceObserver.
 * Provides script-level attribution (Chrome 123+, Edge 123+).
 *
 * @param onEntry - callback fired for each detected LoAF entry
 */
function observeLoAF(onEntry: (e: LongTaskEvent) => void): void {
  if (!supportsEntryType('long-animation-frame')) {
    log('Long Animation Frames (LoAF) API is not supported in this browser', 'info');

    return;
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as LoAFEntry;
        const durationMs = Math.round(loaf.duration);
        const blockingDurationMs = loaf.blockingDuration != null
          ? Math.round(loaf.blockingDuration)
          : null;

        const relevantScripts = loaf.scripts?.filter((s) => s.sourceURL || s.sourceFunctionName);

        const scripts = relevantScripts?.length
          ? relevantScripts.reduce<Json>((acc, s, i) => {
            acc[`script_${i}`] = serializeScript(s);

            return acc;
          }, {})
          : null;

        const details = compact([
          ['kind', 'loaf'],
          ['startTime', Math.round(loaf.startTime)],
          ['durationMs', durationMs],
          ['blockingDurationMs', blockingDurationMs],
          ['renderStart', loaf.renderStart ? Math.round(loaf.renderStart) : null],
          ['styleAndLayoutStart', loaf.styleAndLayoutStart ? Math.round(loaf.styleAndLayoutStart) : null],
          ['firstUIEventTimestamp', loaf.firstUIEventTimestamp ? Math.round(loaf.firstUIEventTimestamp) : null],
          ['scripts', scripts],
        ]);

        const blockingNote = blockingDurationMs != null
          ? ` (blocking ${blockingDurationMs} ms)`
          : '';

        const topScript = relevantScripts?.[0];
        const culprit = topScript?.sourceFunctionName
          || topScript?.invoker
          || topScript?.sourceURL
          || '';
        const culpritNote = culprit ? ` — ${culprit}` : '';

        onEntry({
          title: `Long Animation Frame ${durationMs} ms${blockingNote}${culpritNote}`,
          context: { mainThreadBlocking: details },
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch { /* unsupported — ignore */ }
}

/**
 * Set up observers for main-thread blocking detection.
 * Each detected entry fires `onEntry` immediately.
 */
export function observeMainThreadBlocking(
  options: MainThreadBlockingOptions,
  onEntry: (e: LongTaskEvent) => void
): void {
  if (options.longTasks ?? true) {
    observeLongTasks(onEntry);
  }

  if (options.longAnimationFrames ?? true) {
    observeLoAF(onEntry);
  }
}
