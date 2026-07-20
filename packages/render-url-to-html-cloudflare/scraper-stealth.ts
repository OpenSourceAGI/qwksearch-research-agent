/**
 * @file scraper-stealth.ts
 * @description Browser stealth evasion techniques injected into every new
 * Puppeteer page before navigation.  Each evasion patches a specific browser
 * API that bot-detection services inspect (navigator.webdriver, plugins,
 * WebGL, canvas fingerprinting, etc.) so the headless Chrome instance
 * presents as an ordinary desktop browser.
 */

import type { Page } from "@cloudflare/puppeteer";

/**
 * Applies 24 stealth evasion patches to `page` via `evaluateOnNewDocument`
 * so they take effect before any page script runs.
 * Must be called before the first `page.goto()`.
 *
 * @param page - Puppeteer {@link Page} instance to patch.
 * @returns Resolves once all patches have been registered.
 */
export async function applyStealthEvasions(page: Page): Promise<void> {
  // Evasion 1: Override navigator.webdriver - CRITICAL for reCAPTCHA
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
      configurable: true,
    });

    if (navigator.webdriver) {
      delete (Object.getPrototypeOf(navigator) as Record<string, unknown>)
        .webdriver;
    }

    const originalQuery = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      "webdriver",
    );
    if (originalQuery) {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        get: () => false,
        configurable: true,
      });
    }
  });

  // Evasion 2: Remove automation-related properties from window
  await page.evaluateOnNewDocument(() => {
    const props = Object.keys(window).filter(
      (k) => k.startsWith("cdc_") || k.startsWith("$cdc_"),
    );
    props.forEach((prop) => {
      delete (window as Record<string, unknown>)[prop];
    });

    delete (window as Record<string, unknown>).callPhantom;
    delete (window as Record<string, unknown>)._phantom;
    delete (window as Record<string, unknown>).__nightmare;
    delete (window as Record<string, unknown>).domAutomation;
    delete (window as Record<string, unknown>).domAutomationController;
    delete (window as Record<string, unknown>)._Selenium_IDE_Recorder;
    delete (window as Record<string, unknown>)._selenium;
    delete (window as Record<string, unknown>).__webdriver_script_fn;
    delete (window as Record<string, unknown>).__driver_evaluate;
    delete (window as Record<string, unknown>).__webdriver_evaluate;
    delete (window as Record<string, unknown>).__selenium_evaluate;
    delete (window as Record<string, unknown>).__fxdriver_evaluate;
    delete (window as Record<string, unknown>).__driver_unwrapped;
    delete (window as Record<string, unknown>).__webdriver_unwrapped;
    delete (window as Record<string, unknown>).__selenium_unwrapped;
    delete (window as Record<string, unknown>).__fxdriver_unwrapped;
    delete (window as Record<string, unknown>).__webdriver_script_func;
    delete (window as Record<string, unknown>).__webdriver_script_function;
    delete (document as Record<string, unknown>).__webdriver_evaluate;
    delete (document as Record<string, unknown>).__selenium_evaluate;
    delete (document as Record<string, unknown>).__webdriver_script_function;
  });

  // Evasion 3: Mock chrome runtime to appear as a real Chrome install
  await page.evaluateOnNewDocument(() => {
    (window as Record<string, unknown>).chrome = {
      runtime: {
        onConnect: {
          addListener: function () {},
          removeListener: function () {},
        },
        onMessage: {
          addListener: function () {},
          removeListener: function () {},
        },
        connect: function () {
          return {
            onMessage: { addListener: function () {} },
            postMessage: function () {},
          };
        },
        sendMessage: function () {},
        id: undefined,
        getPlatformInfo: function (cb: (info: object) => void) {
          cb({ os: "win", arch: "x86-64", nacl_arch: "x86-64" });
        },
        getManifest: function () {
          return {};
        },
      },
      loadTimes: function () {
        return {
          requestTime: Date.now() * 0.001,
          startLoadTime: Date.now() * 0.001,
          commitLoadTime: Date.now() * 0.001,
          finishDocumentLoadTime: Date.now() * 0.001,
          finishLoadTime: Date.now() * 0.001,
          firstPaintTime: Date.now() * 0.001,
          firstPaintAfterLoadTime: 0,
          navigationType: "Other",
          wasFetchedViaSpdy: false,
          wasNpnNegotiated: false,
          npnNegotiatedProtocol: "unknown",
          wasAlternateProtocolAvailable: false,
          connectionInfo: "http/1.1",
        };
      },
      csi: function () {
        return {
          onloadT: Date.now(),
          pageT: Date.now() - 1000,
          startE: Date.now() - 2000,
          tran: 15,
        };
      },
      app: {
        isInstalled: false,
        InstallState: {
          DISABLED: "disabled",
          INSTALLED: "installed",
          NOT_INSTALLED: "not_installed",
        },
        RunningState: {
          CANNOT_RUN: "cannot_run",
          READY_TO_RUN: "ready_to_run",
          RUNNING: "running",
        },
        getDetails: function () {
          return null;
        },
        getIsInstalled: function () {
          return false;
        },
        runningState: function () {
          return "cannot_run";
        },
      },
    };
  });

  // Evasion 4: Override navigator.plugins to match a real Chrome install
  await page.evaluateOnNewDocument(() => {
    const makePlugin = (
      name: string,
      description: string,
      filename: string,
      mimeTypes: Array<{ type: string; suffixes: string; description: string }>,
    ) => {
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: name, enumerable: true },
        description: { value: description, enumerable: true },
        filename: { value: filename, enumerable: true },
        length: { value: mimeTypes.length, enumerable: true },
      });
      mimeTypes.forEach((mt, i) => {
        const mimeType = Object.create(MimeType.prototype);
        Object.defineProperties(mimeType, {
          type: { value: mt.type, enumerable: true },
          suffixes: { value: mt.suffixes, enumerable: true },
          description: { value: mt.description, enumerable: true },
          enabledPlugin: { value: plugin, enumerable: true },
        });
        Object.defineProperty(plugin, i, { value: mimeType, enumerable: true });
        Object.defineProperty(plugin, mt.type, {
          value: mimeType,
          enumerable: false,
        });
      });
      return plugin;
    };

    const plugins = [
      makePlugin(
        "Chrome PDF Plugin",
        "Portable Document Format",
        "internal-pdf-viewer",
        [
          {
            type: "application/x-google-chrome-pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
          },
        ],
      ),
      makePlugin("Chrome PDF Viewer", "", "mhjfbmdgcfjbbpaeojofohoefgiehjai", [
        { type: "application/pdf", suffixes: "pdf", description: "" },
      ]),
      makePlugin("Native Client", "", "internal-nacl-plugin", [
        {
          type: "application/x-nacl",
          suffixes: "",
          description: "Native Client Executable",
        },
        {
          type: "application/x-pnacl",
          suffixes: "",
          description: "Portable Native Client Executable",
        },
      ]),
    ];

    const pluginArray = Object.create(PluginArray.prototype);
    plugins.forEach((plugin, i) => {
      Object.defineProperty(pluginArray, i, {
        value: plugin,
        enumerable: true,
      });
      Object.defineProperty(pluginArray, plugin.name, {
        value: plugin,
        enumerable: false,
      });
    });
    Object.defineProperty(pluginArray, "length", {
      value: plugins.length,
      enumerable: true,
    });
    Object.defineProperty(pluginArray, "item", {
      value: function (i: number) {
        return (pluginArray as Record<number, Plugin>)[i] ?? null;
      },
    });
    Object.defineProperty(pluginArray, "namedItem", {
      value: function (name: string) {
        return (pluginArray as Record<string, Plugin>)[name] ?? null;
      },
    });
    Object.defineProperty(pluginArray, "refresh", { value: function () {} });

    Object.defineProperty(navigator, "plugins", {
      get: () => pluginArray,
    });
  });

  // Evasion 5: Override navigator.languages
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    Object.defineProperty(navigator, "language", {
      get: () => "en-US",
    });
  });

  // Evasion 6: Override permissions API - important for reCAPTCHA
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query.bind(
      window.navigator.permissions,
    );
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === "notifications") {
        return Promise.resolve({
          state: Notification.permission as PermissionState,
          onchange: null,
        } as PermissionStatus);
      }
      if (
        (parameters.name as string) === "midi" ||
        (parameters.name as string) === "camera" ||
        (parameters.name as string) === "microphone"
      ) {
        return Promise.resolve({
          state: "prompt" as PermissionState,
          onchange: null,
        } as PermissionStatus);
      }
      return originalQuery(parameters);
    };
  });

  // Evasion 7: Override navigator.hardwareConcurrency
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  });

  // Evasion 8: Override navigator.deviceMemory
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });

  // Evasion 9: Fix iframe contentWindow - critical for reCAPTCHA
  await page.evaluateOnNewDocument(() => {
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function <T extends Node>(child: T): T {
      return originalAppendChild.call(this, child) as T;
    };
  });

  // Evasion 10: Mock WebGL vendor and renderer with realistic GPU values
  await page.evaluateOnNewDocument(() => {
    const getParameterProxyHandler: ProxyHandler<
      WebGLRenderingContext["getParameter"]
    > = {
      apply: function (target, ctx, args) {
        const param = args[0] as number;
        const result = Reflect.apply(
          target as (...a: unknown[]) => unknown,
          ctx,
          args,
        );
        if (param === 37445) return "Google Inc. (NVIDIA)";
        if (param === 37446)
          return "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)";
        if (param === 7938) return "WebGL 1.0 (OpenGL ES 2.0 Chromium)";
        if (param === 35724)
          return "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)";
        return result;
      },
    };

    try {
      WebGLRenderingContext.prototype.getParameter = new Proxy(
        WebGLRenderingContext.prototype.getParameter,
        getParameterProxyHandler as ProxyHandler<
          typeof WebGLRenderingContext.prototype.getParameter
        >,
      );
    } catch (_e) {}

    try {
      WebGL2RenderingContext.prototype.getParameter = new Proxy(
        WebGL2RenderingContext.prototype.getParameter,
        getParameterProxyHandler as ProxyHandler<
          typeof WebGL2RenderingContext.prototype.getParameter
        >,
      );
    } catch (_e) {}
  });

  // Evasion 11: Override navigator.platform
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "platform", { get: () => "Win32" });
  });

  // Evasion 12: Override navigator.maxTouchPoints (desktop = 0)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 0 });
  });

  // Evasion 13: Override navigator.connection with realistic 4G values
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "connection", {
      get: () => ({
        effectiveType: "4g",
        rtt: 50,
        downlink: 10,
        saveData: false,
        onchange: null,
        addEventListener: function () {},
        removeEventListener: function () {},
      }),
    });
  });

  // Evasion 14: Override navigator.vendor
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "vendor", { get: () => "Google Inc." });
  });

  // Evasion 15: Mock battery API
  await page.evaluateOnNewDocument(() => {
    (navigator as Navigator & { getBattery?: () => Promise<unknown> }).getBattery =
      () =>
        Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.95 + Math.random() * 0.05,
          addEventListener: function () {},
          removeEventListener: function () {},
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null,
        });
  });

  // Evasion 16: Fix prototype chain and toStringTag
  await page.evaluateOnNewDocument(() => {
    try {
      Object.defineProperty(Navigator.prototype, Symbol.toStringTag, {
        get: () => "Navigator",
        configurable: true,
      });
    } catch (_e) {}
  });

  // Evasion 17: Override Notification.permission
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Notification, "permission", {
      get: () => "default",
      configurable: true,
    });
  });

  // Evasion 18: Align outerWidth/outerHeight with innerWidth/innerHeight
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, "outerWidth", {
      get: () => window.innerWidth,
      configurable: true,
    });
    Object.defineProperty(window, "outerHeight", {
      get: () => window.innerHeight + 85,
      configurable: true,
    });
  });

  // Evasion 19: Fix Function.prototype.toString to avoid proxy detection
  await page.evaluateOnNewDocument(() => {
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function (this: Function) {
      if (this === Function.prototype.toString) {
        return "function toString() { [native code] }";
      }
      return originalToString.call(this);
    };
    Object.defineProperty(Function.prototype.toString, "name", {
      value: "toString",
    });
  });

  // Evasion 20: Add subtle noise to canvas toDataURL for fingerprint resistance
  await page.evaluateOnNewDocument(() => {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (
      this: HTMLCanvasElement,
      type?: string,
      ...args: unknown[]
    ) {
      if (type === "image/png" && this.width === 220 && this.height === 30) {
        const ctx = this.getContext("2d");
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 2);
            imageData.data[i + 1] += Math.floor(Math.random() * 2);
            imageData.data[i + 2] += Math.floor(Math.random() * 2);
          }
          ctx.putImageData(imageData, 0, 0);
        }
      }
      return originalToDataURL.apply(this, [type, ...args] as [
        string?,
        ...unknown[]
      ]);
    };
  });

  // Evasion 21: Add noise to AudioContext analyser for fingerprint resistance
  await page.evaluateOnNewDocument(() => {
    type AnyAudioContext = typeof AudioContext | typeof webkitAudioContext;
    const AudioContextClass: AnyAudioContext | undefined =
      window.AudioContext ?? (window as Record<string, unknown>).webkitAudioContext as AnyAudioContext | undefined;
    const originalCreateAnalyser =
      AudioContextClass?.prototype?.createAnalyser;
    if (originalCreateAnalyser && AudioContextClass) {
      AudioContextClass.prototype.createAnalyser = function (
        this: AudioContext,
      ) {
        const analyser = originalCreateAnalyser.call(this);
        const originalGetFloatFrequencyData =
          analyser.getFloatFrequencyData.bind(analyser);
        analyser.getFloatFrequencyData = function (array: Float32Array) {
          originalGetFloatFrequencyData(array);
          for (let i = 0; i < array.length; i++) {
            array[i] += Math.random() * 0.0001;
          }
        };
        return analyser;
      };
    }
  });

  // Evasion 22: Stub getClientRects (noise hook reserved for future use)
  await page.evaluateOnNewDocument(() => {
    const originalGetClientRects = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function (this: Element) {
      return originalGetClientRects.call(this);
    };
  });

  // Evasion 23: Remove navigator.brave to avoid Brave-browser fingerprinting
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "brave", {
      get: () => undefined,
      configurable: true,
    });
  });

  // Evasion 24: Lock screen dimensions to a standard 1920×1080 desktop
  await page.evaluateOnNewDocument(() => {
    const screenProps: Record<string, number> = {
      availWidth: 1920,
      availHeight: 1040,
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
    };
    for (const [key, value] of Object.entries(screenProps)) {
      Object.defineProperty(screen, key, {
        get: () => value,
        configurable: true,
      });
    }
  });
}
