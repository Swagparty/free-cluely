import { BrowserWindow } from "electron"
import { EventEmitter } from "events"

export class AudioCaptureManager extends EventEmitter {
  private capturing: boolean = false
  private mainWindow: BrowserWindow | null = null

  constructor() {
    super()
  }

  public setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  public async startCapture(): Promise<{ success: boolean; error?: string }> {
    if (this.capturing) return { success: true }
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return { success: false, error: "No window available" }
    }

    try {
      this.capturing = true
      this.mainWindow.webContents.send("audio:start-capture")
      this.emit("capture-started")
      return { success: true }
    } catch (err: any) {
      this.capturing = false
      return { success: false, error: err.message }
    }
  }

  public stopCapture(): void {
    if (!this.capturing) return
    this.capturing = false
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("audio:stop-capture")
    }
    this.emit("capture-stopped")
  }

  public isCapturing(): boolean {
    return this.capturing
  }

  public handleAudioChunk(pcmData: string): void {
    if (!this.capturing) return
    this.emit("audio-chunk", pcmData)
  }

  public destroy(): void {
    this.stopCapture()
    this.removeAllListeners()
  }
}
