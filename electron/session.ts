import { BrowserWindow } from "electron"
import { EventEmitter } from "events"
import { AuthManager } from "./auth"
import { CopilotWebSocket } from "./websocket"

const API_BASE = process.env.MONA_API_BASE_URL || "https://api.mona-ai.cloud"
const WS_BASE = process.env.MONA_WS_BASE_URL || "wss://api.mona-ai.cloud"

type SessionStatus = "idle" | "loading" | "active" | "ending" | "summary"

interface UpcomingInterview {
  interviewId: string
  jobId: string
  candidateId: string
  candidateName: string
  jobTitle: string
  scheduledAt: string
  recruiterId: string
}

export class SessionManager extends EventEmitter {
  private auth: AuthManager
  private ws: CopilotWebSocket
  private sessionId: string | null = null
  private status: SessionStatus = "idle"
  private mainWindow: BrowserWindow | null = null

  constructor(auth: AuthManager, ws: CopilotWebSocket) {
    super()
    this.auth = auth
    this.ws = ws

    this.ws.on("transcript", (chunk: any) => {
      this.sendToRenderer("transcript:chunk", chunk)
    })

    this.ws.on("suggestion", (suggestion: any) => {
      this.sendToRenderer("suggestion:new", suggestion)
    })

    this.ws.on("coverage", (update: any) => {
      this.sendToRenderer("coverage:update", update)
    })

    this.ws.on("health", (health: string) => {
      this.sendToRenderer("connection:status", health)
    })

    this.ws.on("extended_disconnect", () => {
      this.sendToRenderer("connection:extended_disconnect")
    })
  }

  public setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  private async apiRequest(path: string, options: RequestInit = {}): Promise<any> {
    const apiKey = this.auth.getApiKey()
    if (!apiKey) throw new Error("Not authenticated")

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(options.headers || {})
      }
    })

    if (response.status === 401) {
      this.auth.emit("auth:expired")
      throw new Error("Session expired")
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || `Request failed (${response.status})`)
    }

    return response.json()
  }

  public async getUpcomingInterviews(): Promise<UpcomingInterview[]> {
    const data = await this.apiRequest("/api/copilot/interviews/upcoming")
    return data.interviews || []
  }

  public async startSession(interviewId: string): Promise<any> {
    this.setStatus("loading")

    try {
      const data = await this.apiRequest("/api/copilot/sessions/start", {
        method: "POST",
        body: JSON.stringify({ interview_id: interviewId })
      })

      this.sessionId = data.session_id

      if (data.consent_status === "not_consented") {
        this.setStatus("active")
        return { ...data, notesOnlyMode: true }
      }

      if (data.consent_status === "unknown") {
        this.setStatus("idle")
        throw new Error("Candidate consent required before starting session")
      }

      const apiKey = this.auth.getApiKey()
      if (apiKey && this.sessionId) {
        this.ws.connect(WS_BASE, this.sessionId, apiKey)
      }

      this.setStatus("active")
      return data
    } catch (err) {
      this.setStatus("idle")
      throw err
    }
  }

  public async endSession(): Promise<any> {
    if (!this.sessionId) throw new Error("No active session")

    this.setStatus("ending")

    try {
      const data = await this.apiRequest(`/api/copilot/sessions/${this.sessionId}/end`, {
        method: "POST"
      })

      this.ws.disconnect()
      this.setStatus("summary")

      return data
    } catch (err) {
      this.setStatus("active")
      throw err
    }
  }

  public async sendAction(action: any): Promise<void> {
    if (!this.sessionId) throw new Error("No active session")

    await this.apiRequest(`/api/copilot/sessions/${this.sessionId}/actions`, {
      method: "POST",
      body: JSON.stringify(action)
    })
  }

  public resetToIdle(): void {
    this.ws.disconnect()
    this.sessionId = null
    this.setStatus("idle")
  }

  private setStatus(status: SessionStatus): void {
    this.status = status
    this.emit("status", status)
    this.sendToRenderer("session:status", status)
  }

  public getStatus(): SessionStatus {
    return this.status
  }

  public getSessionId(): string | null {
    return this.sessionId
  }

  public destroy(): void {
    this.ws.destroy()
    this.removeAllListeners()
  }
}
