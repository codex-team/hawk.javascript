/**
 * Trace HTTP header propagation configuration.
 */
export interface TracePropagationOptions {
  /**
   * URLs/patterns that receive `hawk-trace-id` header.
   *
   * Feature is enabled only when at least one valid target is provided.
   */
  propagationTargets?: (string | RegExp)[];
}
