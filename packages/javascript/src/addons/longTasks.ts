/**
 * @file Long Task & Long Animation Frame (LoAF) tracking via PerformanceObserver
 *
 * Both APIs are Chromium-only (Chrome, Edge).
 * - Long Tasks: tasks blocking the main thread for >50 ms
 * - LoAF (Chrome 123+): richer attribution per long animation frame
 *
 * Sets up observers and fires `onEntry` per detected entry — fire and forget.
 */

import type { EventContext, Json } from '@hawk.so/types';
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
 * LoAF entry shape (spec is still evolving)
 */
interface LoAFEntry extends PerformanceEntry {
  blockingDuration?: number;
  scripts?: {
    name: string;
    invoker?: string;
    invokerType?: string;
    sourceURL?: string;
    duration: number;
  }[];
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
        const durationMs = Math.round(entry.duration);

        onEntry({
          title: `Long Task ${durationMs} ms`,
          context: {
            kind: 'longtask',
            startTime: Math.round(entry.startTime),
            durationMs,
          },
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
          : undefined;

        const scripts = loaf.scripts
          ?.filter((s) => s.sourceURL)
          .reduce<Record<string, Json>>((acc, s, i) => {
            acc[`script_${i}`] = {
              name: s.name,
              invoker: s.invoker ?? '',
              invokerType: s.invokerType ?? '',
              sourceURL: s.sourceURL ?? '',
              duration: Math.round(s.duration),
            };

            return acc;
          }, {});

        const blockingNote = blockingDurationMs != null
          ? ` (blocking ${blockingDurationMs} ms)`
          : '';

        const context: EventContext = {
          kind: 'loaf',
          startTime: Math.round(loaf.startTime),
          durationMs,
        };

        if (blockingDurationMs != null) {
          context.blockingDurationMs = blockingDurationMs;
        }

        if (scripts && Object.keys(scripts).length > 0) {
          context.scripts = scripts;
        }

        onEntry({
          title: `Long Animation Frame ${durationMs} ms${blockingNote}`,
          context,
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
