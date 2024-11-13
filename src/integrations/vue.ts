import type { JsonNode, VueIntegrationAddons } from '@hawk.so/types';

interface VueIntegrationOptions {
  /**
   * Disable Vue.js error handler
   *
   * Used by @hawk.so/nuxt since Nuxt has own error hook.
   * Otherwise, Nuxt will show 500 error
   */
  disableVueErrorHandler?: boolean;
}

/**
 * Errors fired inside Vue components are not dispatched by global handlers.
 * This integration allow us to set up own error handler
 */
export class VueIntegration {
  /**
   * Vue application to handle errors in it
   */
  private readonly vue;

  /**
   * User can set up own vue error handler,
   * we should save and call it at the end
   */
  private readonly existedHandler: () => void;

  /**
   * Callback that should be triggered with caught error.
   * This callback is used by parent class to format and send an event.
   */
  private readonly callback: (error: Error, addons: VueIntegrationAddons) => void;

  /**
   * Set up a new vue app
   *
   * @param vue - Vue app to handle
   * @param callback - callback that accepts new error
   * @param options - additional options
   */
  constructor(vue, callback, options: VueIntegrationOptions) {
    this.vue = vue;
    this.existedHandler = vue.config.errorHandler;
    this.callback = callback;

    if (options.disableVueErrorHandler !== true) {
      this.setupHandler();
    }
  }

  /**
   * Extract additional useful information from the Vue app
   *
   * Can be used outside of this class, for example, by Nuxt integration
   *
   * @param vm - component instance
   * @param info - a Vue-specific error info, e.g. which lifecycle hook the error was found in.
   */
  public spoilAddons(vm: { [key: string]: unknown }, info: string): VueIntegrationAddons {
    const isVue3 = vm.$ !== undefined;

    if (isVue3) {
      return this.spoilAddonsFromVue3(vm, info);
    } else {
      return this.spoilAddonsFromVue2(vm, info);
    }
  }

  /**
   * Setups event handlers for Vue.js instance
   */
  private setupHandler(): void {
    this.vue.config.errorHandler =
      /**
       * Vue app error handler
       *
       * @see https://vuejs.org/v2/api/#errorHandler
       * @param err - error thrown
       * @param vm - vue VM
       * @param info - a Vue-specific error info, e.g. which lifecycle hook the error was found in.
       */
      (err: Error, vm:  {[key: string]: unknown}, info: string): void => {
        if (typeof this.existedHandler === 'function') {
          this.existedHandler.call(this.vue, err, vm, info);
        }

        const addons: VueIntegrationAddons = this.spoilAddons(vm, info);

        this.callback(err, addons);

        this.printError(err, info, addons.component);
      };
  }

  /**
   * Extract additional useful information from the Vue 2 app
   *
   * @param vm - component instance
   * @param info - which lifecycle hook the error was found in.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private spoilAddonsFromVue2(vm: { [key: string]: any }, info: string): VueIntegrationAddons {
    const addons: VueIntegrationAddons = {
      lifecycle: info,
      component: null,
    };

    /**
     * Get component name
     */
    if (vm.$root === vm) {
      addons.component = vm.$el.outerHTML.replace(/>.*/, '>') + ' (root)';
    } else {
      addons.component = '<' + (vm._isVue ? vm.$options.name || vm.$options._componentTag : vm.name) + '>';
    }

    /**
     * Fill props
     */
    if (vm.$options && vm.$options.propsData) {
      addons.props = vm.$options.propsData;
    }

    /**
     * Fill component's data values
     */
    if (vm._data) {
      addons.data = {};

      Object.entries(vm._data).forEach(([key, value]) => {
        addons.data![key] = value as JsonNode;
      });
    }

    /**
     * Fill computed
     */
    if (vm._computedWatchers) {
      addons.computed = {};

      Object.entries(vm._computedWatchers).forEach(([key, watcher]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addons.computed![key] = (watcher as {[key: string]: any}).value;
      });
    }

    return addons;
  }

  /**
   * Extract additional useful information from the Vue 3 app
   *
   * @param vm - component instance
   * @param info - which lifecycle hook the error was found in.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private spoilAddonsFromVue3(vm: { [key: string]: any }, info: string): VueIntegrationAddons {
    const addons: VueIntegrationAddons = {
      lifecycle: this.getRuntimeErrorSourceByCode(info),
      component: null,
    };

    /**
     * Extract the component name
     */
    if (vm.$options !== undefined) {
      addons['component'] = `<${vm.$options.__name || vm.$options.name || vm.$options._componentTag || 'Anonymous'}>`;
    }

    /**
     * Fill props
     */
    if (Object.keys(vm.$props).length) {
      addons['props'] = vm.$props;
    }

    return addons;
  }

  /**
   * In production, the error code is a link with reference to doc.
   * This method returns the error message by the code extracted from the link
   *
   * @param code - Error source info (3rd argument of the vue:error hook)
   * https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured
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


  /**
   * Write error to the console
   *
   * @param err - error to print
   * @param info - a Vue-specific error info, e.g. which lifecycle hook the error was found in.
   * @param component - where error was occurred
   */
  private printError(err: Error, info: string, component: string | null): void {
    const source = this.getRuntimeErrorSourceByCode(info);

    if (component === null) {
      console.error(`${source}`, err);

      return;
    }

    console.error(`${component} @ ${source}`, err);
  }
}

