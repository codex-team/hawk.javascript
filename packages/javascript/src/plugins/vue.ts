import type { CatcherMessagePayload } from '@hawk.so/types';
import type { VueIntegrationAddons, JsonNode } from '@hawk.so/types';
import type { HawkCatcherPlugin } from '@hawk.so/core';

/**
 * Plugin that integrates with Vue 2 / Vue 3 error handling.
 */
export class VuePlugin implements HawkCatcherPlugin<'errors/javascript'> {
  public readonly name = 'vue';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly vue: any;

  /**
   * Whether to suppress the original Vue error handler
   */
  private readonly disableVueErrorHandler: boolean;

  /**
   * Saved original error handler (to chain calls)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private existedHandler: any = null;

  /**
   * @param vue - Vue app instance (Vue 2 or Vue 3)
   * @param options - plugin options
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vue: any,
    options: { disableVueErrorHandler?: boolean } = {}
  ) {
    this.vue = vue;
    this.disableVueErrorHandler = options.disableVueErrorHandler ?? false;
  }

  /**
   * Install Vue error handler
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setup(catcher: any): void {
    this.existedHandler = this.vue.config.errorHandler;

    if (this.disableVueErrorHandler) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const plugin = this;

    this.vue.config.errorHandler = (
      err: Error,
      vm: { [key: string]: unknown },
      info: string
    ): void => {
      if (typeof plugin.existedHandler === 'function') {
        plugin.existedHandler.call(plugin.vue, err, vm, info);
      }

      const addons = plugin.spoilAddons(vm, info);

      plugin.printError(err, info, addons.component);

      catcher.captureError(err, { vue: addons });
    };
  }

  /**
   * Attach Vue addons from hint to the event
   */
  public processEvent(
    event: CatcherMessagePayload<'errors/javascript'>,
    hint: Record<string, unknown>
  ): CatcherMessagePayload<'errors/javascript'> {
    if (hint['vue']) {
      return {
        ...event,
        addons: {
          ...(event.addons ?? {}),
          vue: hint['vue'] as VueIntegrationAddons,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      };
    }

    return event;
  }

  /**
   * Extract Vue-specific addons from the component instance
   */
  public spoilAddons(vm: { [key: string]: unknown }, info: string): VueIntegrationAddons {
    const isVue3 = vm.$ !== undefined;

    if (isVue3) {
      return this.spoilAddonsFromVue3(vm, info);
    }

    return this.spoilAddonsFromVue2(vm, info);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private spoilAddonsFromVue2(vm: { [key: string]: any }, info: string): VueIntegrationAddons {
    const addons: VueIntegrationAddons = {
      lifecycle: info,
      component: null,
    };

    if (vm.$root === vm) {
      addons.component = vm.$el.outerHTML.replace(/>.*/, '>') + ' (root)';
    } else {
      addons.component = '<' + (vm._isVue ? vm.$options.name || vm.$options._componentTag : vm.name) + '>';
    }

    if (vm.$options && vm.$options.propsData) {
      addons.props = vm.$options.propsData;
    }

    if (vm._data) {
      addons.data = {};

      Object.entries(vm._data).forEach(([key, value]) => {
        addons.data![key] = value as JsonNode;
      });
    }

    if (vm._computedWatchers) {
      addons.computed = {};

      Object.entries(vm._computedWatchers).forEach(([key, watcher]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addons.computed![key] = (watcher as { [key: string]: any }).value;
      });
    }

    return addons;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private spoilAddonsFromVue3(vm: { [key: string]: any }, info: string): VueIntegrationAddons {
    const addons: VueIntegrationAddons = {
      lifecycle: this.getRuntimeErrorSourceByCode(info),
      component: null,
    };

    if (vm.$options !== undefined) {
      addons.component = `<${vm.$options.__name || vm.$options.name || vm.$options._componentTag || 'Anonymous'}>`;
    }

    if (Object.keys(vm.$props).length) {
      addons.props = vm.$props;
    }

    return addons;
  }

  /**
   * Decode Vue 3 production error code to a human-readable string
   */
  private getRuntimeErrorSourceByCode(code: string): string {
    if (!code.includes('https://vuejs.org/error-reference/#runtime-')) {
      return code;
    }

    const codeParts = code.split('https://vuejs.org/error-reference/#runtime-');
    const errorCode = codeParts[codeParts.length - 1];

    const errorCodeMap = new Map([
      ['0', 'setup function'],
      ['1', 'render function'],
      ['2', 'watcher getter'],
      ['3', 'watcher callback'],
      ['4', 'watcher cleanup function'],
      ['5', 'native event handler'],
      ['6', 'component event handler'],
      ['7', 'vnode hook'],
      ['8', 'directive hook'],
      ['9', 'transition hook'],
      ['10', 'app errorHandler'],
      ['11', 'app warnHandler'],
      ['12', 'ref function'],
      ['13', 'async component loader'],
      ['14', 'scheduler flush'],
      ['15', 'component update'],
      ['16', 'app unmount cleanup function'],
      ['sp', 'serverPrefetch hook'],
      ['bc', 'beforeCreate hook'],
      ['c', 'created hook'],
      ['bm', 'beforeMount hook'],
      ['m', 'mounted hook'],
      ['bu', 'beforeUpdate hook'],
      ['u', 'updated'],
      ['bum', 'beforeUnmount hook'],
      ['um', 'unmounted hook'],
      ['a', 'activated hook'],
      ['da', 'deactivated hook'],
      ['ec', 'errorCaptured hook'],
      ['rtc', 'renderTracked hook'],
      ['rtg', 'renderTriggered hook'],
    ]);

    return errorCodeMap.get(errorCode) || code;
  }

  private printError(err: Error, info: string, component: string | null): void {
    const source = this.getRuntimeErrorSourceByCode(info);

    if (component === null) {
      console.error(`${source}`, err);

      return;
    }

    console.error(`${component} @ ${source}`, err);
  }
}
