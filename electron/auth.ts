import { safeStorage, app } from "electron"
import { EventEmitter } from "events"
import path from "node:path"
import fs from "node:fs"
import { MonaApiClient } from "./monaApi"

const KEY_FILE = "mona_live_key.enc"

export class AuthManager extends EventEmitter {
  private apiKey: string | null = null
  private storagePath: string = ""
  public api: MonaApiClient

  constructor() {
    super()
    this.storagePath = app.getPath("userData")
    this.api = new MonaApiClient()
    this.loadStoredKey()
  }

  private getFilePath(filename: string): string {
    return path.join(this.storagePath, filename)
  }

  private encryptAndStore(data: string): void {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(data)
        fs.writeFileSync(this.getFilePath(KEY_FILE), encrypted)
      }
    } catch (err) {
      console.error("[AuthManager] Failed to store key:", err)
    }
  }

  private loadAndDecrypt(): string | null {
    try {
      const filePath = this.getFilePath(KEY_FILE)
      if (!fs.existsSync(filePath)) return null
      if (!safeStorage.isEncryptionAvailable()) return null
      const encrypted = fs.readFileSync(filePath)
      return safeStorage.decryptString(encrypted)
    } catch {
      return null
    }
  }

  private removeKeyFile(): void {
    try {
      const filePath = this.getFilePath(KEY_FILE)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch { /* ignore */ }
  }

  private loadStoredKey(): void {
    const stored = this.loadAndDecrypt()
    if (stored) {
      this.apiKey = stored
      this.api.setApiKey(stored)
    }
  }

  public async loginWithKey(key: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[AuthManager] loginWithKey called, key length: ${key.length}, prefix: ${key.substring(0, 8)}...`)
    this.api.setApiKey(key)

    const result = await this.api.validateKey()
    console.log(`[AuthManager] validateKey result:`, result)
    if (!result.valid) {
      this.api.clearApiKey()
      return { success: false, error: result.error || "Sitzung abgelaufen. Bitte melden Sie sich erneut an." }
    }

    this.apiKey = key
    this.encryptAndStore(key)
    this.emit("auth:login")
    return { success: true }
  }

  public async tryAutoLogin(): Promise<boolean> {
    if (!this.apiKey) return false

    const result = await this.api.validateKey()
    if (result.valid) {
      this.emit("auth:login")
      return true
    }

    this.apiKey = null
    this.api.clearApiKey()
    this.removeKeyFile()
    return false
  }

  public logout(): void {
    this.apiKey = null
    this.api.clearApiKey()
    this.removeKeyFile()
    this.emit("auth:logout")
  }

  public isAuthenticated(): boolean {
    return this.apiKey !== null
  }

  public getApiKey(): string | null {
    return this.apiKey
  }

  public destroy(): void {
    this.removeAllListeners()
  }
}
