import puppeteerBase from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";

puppeteerExtra.use(StealthPlugin());

let browser: Browser | null = null;
let page: Page | null = null;
let currentMode: "normal" | "stealth" | null = null;

const FLIGGY_ANTI_DETECT_SCRIPT = `
  // RTCPeerConnection 模拟
  const oldRTCPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function(config) {
    return new oldRTCPeerConnection(config);
  };
  Object.defineProperty(window.RTCPeerConnection, 'prototype', {
    get: () => oldRTCPeerConnection.prototype
  });

  // 传感器权限模拟
  if (!window.DeviceMotionEvent) {
    window.DeviceMotionEvent = function() {};
  }
  if (!window.DeviceOrientationEvent) {
    window.DeviceOrientationEvent = function() {};
  }
  
  // Gyroscope 模拟
  if (!window.Gyroscope) {
    window.Gyroscope = function() {};
    window.Gyroscope.prototype = { onerror: null, onreading: null };
  }
  
  // Accelerometer 模拟
  if (!window.Accelerometer) {
    window.Accelerometer = function() {};
    window.Accelerometer.prototype = { onerror: null, onreading: null };
  }

  // permissions.query 模拟
  const originalPermissions = navigator.permissions;
  Object.defineProperty(navigator, 'permissions', {
    get: () => ({
      query: (parameters) => {
        if (parameters.name === 'gyroscope' || 
            parameters.name === 'accelerometer' || 
            parameters.name === 'magnetometer' ||
            parameters.name === 'camera' ||
            parameters.name === 'microphone') {
          return Promise.resolve({ state: 'granted', onchange: null });
        }
        return originalPermissions.query(parameters);
      }
    })
  });

  // WebGL 渲染器模拟
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.';
    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter.call(this, parameter);
  };

  // AudioContext 模拟
  if (!window.AudioContext) {
    window.AudioContext = window.webkitAudioContext || function() {};
  }

  // canvas 指纹干扰
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    if (type === 'image/png') {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] ^= (Math.random() * 2);
        }
        context.putImageData(imageData, 0, 0);
      }
    }
    return originalToDataURL.apply(this, arguments);
  };
`;

export async function getBrowser(mode: "normal" | "stealth" = "normal"): Promise<Browser> {
  if (browser && currentMode === mode) {
    return browser;
  }
  
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
  
  currentMode = mode;
  
  const puppeteer = mode === "stealth" ? puppeteerExtra : puppeteerBase;
  
  const isDocker = process.env.NODE_ENV === "production" || process.env.PUPPETEER_EXECUTABLE_PATH;
  const headless: boolean | "shell" = true;
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  
  browser = await puppeteer.launch({
    headless,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1920,1080",
      "--start-maximized",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-translate",
      "--disable-sync",
      "--ignore-certificate-errors",
      "--log-level=3",
      "--mute-audio",
      "--no-first-run",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--disable-features=PermissionsApi",
      "--disable-color-correct-rendering",
      ...(isDocker ? [
        "--disable-software-rasterizer",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ] : []),
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    defaultViewport: null,
  });
  
  return browser;
}

export async function getPage(mode: "normal" | "stealth" = "normal"): Promise<Page> {
  const b = await getBrowser(mode);
  if (!page || page.isClosed()) {
    page = await b.newPage();
    
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    if (mode === "stealth") {
      await page.evaluateOnNewDocument(FLIGGY_ANTI_DETECT_SCRIPT);
    }
    
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);
    
    await page.setExtraHTTPHeaders({
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
    });
  }
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    currentMode = null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}