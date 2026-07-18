import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, session, desktopCapturer } from "electron"
import path from "node:path"

let initMain: any
let enableLoopbackAudio: any
let disableLoopbackAudio: any
try {
  const loopback = require("electron-audio-loopback")
  initMain = loopback.initMain
  enableLoopbackAudio = loopback.enableLoopbackAudio
  disableLoopbackAudio = loopback.disableLoopbackAudio
  console.log("[AudioLoopback] Module loaded successfully")
} catch (e: any) {
  console.error("[AudioLoopback] Failed to load:", e.message)
}

import { autoUpdater } from "electron-updater"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { AuthManager } from "./auth"
import { CopilotWebSocket } from "./websocket"
import { SessionManager } from "./session"
import { AudioCaptureManager } from "./audioCapture"
import { getTrayIcon } from "./iconHelper"

const PROTOCOL = "monalive"
const isDev = process.env.NODE_ENV === "development"
const isTest = process.env.PLAYWRIGHT_TEST === "true"
const PLATFORM_LOGIN_URL = process.env.MONA_PLATFORM_LOGIN_URL || "https://app.mona-ai.io/profile?copilot=true"
const UPDATE_FEED_URL = "https://updates.mona-ai.io/live"

function setupAutoUpdater(): void {
  if (isDev || isTest) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({ provider: "generic", url: UPDATE_FEED_URL })

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err.message)
  })

  autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version)
  })

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded:", info.version)
  })

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error("[AutoUpdater] checkForUpdates failed:", err.message)
  })
}

export class AppState {
  private static instance: AppState | null = null

  public windowHelper: WindowHelper
  public auth: AuthManager
  public ws: CopilotWebSocket
  public session: SessionManager
  public audioCapture: AudioCaptureManager
  private tray: Tray | null = null

  private settings = {
    overlayPosition: "right" as "left" | "right",
    transparency: 100,
    language: "de" as "de" | "en",
    soundEnabled: false,
    darkMode: true,
    fontSize: 14
  }

  constructor() {
    this.windowHelper = new WindowHelper()
    this.auth = new AuthManager()
    this.ws = new CopilotWebSocket()
    this.session = new SessionManager(this.auth, this.ws)
    this.audioCapture = new AudioCaptureManager()

    this.auth.on("auth:expired", () => {
      const win = this.windowHelper.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send("auth:expired")
      }
    })
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getSettings() {
    return { ...this.settings }
  }

  public updateSettings(partial: Partial<typeof this.settings>): void {
    Object.assign(this.settings, partial)
  }

  public createWindow(): void {
    this.windowHelper.createWindow()
    const win = this.windowHelper.getMainWindow()
    this.session.setMainWindow(win)
    this.audioCapture.setMainWindow(win)
  }

  public openPlatformLogin(): void {
    shell.openExternal(PLATFORM_LOGIN_URL)
  }

  public async handleDeepLink(url: string): Promise<void> {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== `${PROTOCOL}:`) return

      const key = parsed.searchParams.get("key")
      if (!key) return

      const result = await this.auth.loginWithKey(key)
      const mainWindow = this.windowHelper.getMainWindow()

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("auth:deep-link", {
          success: result.success,
          error: result.error
        })

        this.windowHelper.showMainWindow()
      }
    } catch (err: any) {
      console.error("[DeepLink] Failed to handle:", err.message)
    }
  }

  public createTray(): void {
    const trayImage = getTrayIcon()
    this.tray = new Tray(trayImage)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "MONA Live anzeigen",
        click: () => this.windowHelper.showMainWindow()
      },
      {
        label: "Fenster ein-/ausblenden",
        click: () => this.windowHelper.toggleMainWindow()
      },
      { type: "separator" },
      {
        label: "Beenden",
        click: () => app.quit()
      }
    ])

    this.tray.setToolTip("MONA Live")
    this.tray.setContextMenu(contextMenu)

    if (process.platform === "darwin") {
      this.tray.setTitle("MONA")
    }

    this.tray.on("double-click", () => {
      this.windowHelper.showMainWindow()
    })
  }
}

async function initializeApp() {
  if (initMain) {
    try { initMain() } catch (e: any) { console.error("[AudioLoopback] initMain failed:", e.message) }
  }

  app.name = "MONA Live"

  if (!isTest) {
    const gotLock = app.requestSingleInstanceLock()
    if (!gotLock) {
      app.quit()
      return
    }
  }

  const appState = AppState.getInstance()

  if (isDev && process.platform === "win32") {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1])
    ])
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }

  initializeIpcHandlers(appState)

  ipcMain.handle("audio:get-desktop-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"] })
      return sources.map(s => ({ id: s.id, name: s.name }))
    } catch (e: any) {
      console.error("[DesktopCapturer] Error:", e.message)
      return []
    }
  })

  ipcMain.handle("audio:enable-loopback", async () => {
    if (enableLoopbackAudio) {
      try {
        enableLoopbackAudio()
        console.log("[AudioLoopback] Enabled")
        return { success: true }
      } catch (e: any) {
        console.error("[AudioLoopback] enable failed:", e.message)
        return { success: false, error: e.message }
      }
    }
    return { success: false, error: "Loopback not available" }
  })

  ipcMain.handle("audio:disable-loopback", async () => {
    if (disableLoopbackAudio) {
      try {
        disableLoopbackAudio()
        console.log("[AudioLoopback] Disabled")
      } catch (e: any) {
        console.error("[AudioLoopback] disable failed:", e.message)
      }
    }
  })

  app.on("second-instance", (_event, argv) => {
    const deepLinkUrl = argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
    if (deepLinkUrl) {
      appState.handleDeepLink(deepLinkUrl)
    }
    appState.windowHelper.showMainWindow()
  })

  if (process.platform === "win32") {
    const deepLinkArg = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
    if (deepLinkArg) {
      app.whenReady().then(() => appState.handleDeepLink(deepLinkArg))
    }
  }

  app.on("open-url", (_event, url) => {
    appState.handleDeepLink(url)
  })

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = ["media", "microphone", "audio-capture", "display-capture"]
      callback(allowed.includes(permission))
    })

    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      const allowed = ["media", "microphone", "audio-capture", "display-capture"]
      return allowed.includes(permission)
    })

    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      const sources = await desktopCapturer.getSources({ types: ["screen"] })
      if (sources.length > 0) {
        callback({ video: sources[0], audio: "loopback" })
      } else {
        callback({})
      }
    })

    appState.createWindow()
    appState.createTray()
    setupAutoUpdater()
  })

  app.on("activate", () => {
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.on("before-quit", () => {
    appState.audioCapture.destroy()
    appState.session.destroy()
    appState.auth.destroy()
  })

  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

initializeApp().catch(console.error)
