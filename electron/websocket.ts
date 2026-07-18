import { EventEmitter } from "events"
import WebSocket from "ws"

type ConnectionHealth = "connected" | "reconnecting" | "disconnected"

const INITIAL_RETRY_MS = 1000
const MAX_RETRY_MS = 30000
const DISCONNECT_BANNER_MS = 2 * 60 * 1000

export class CopilotWebSocket extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string = ""
  private accessToken: string = ""
  private retryMs: number = INITIAL_RETRY_MS
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private health: ConnectionHealth = "disconnected"
  private lastReceivedTimestamp: string | null = null
  private intentionallyClosed: boolean = false
  private disconnectedAt: number | null = null

  public connect(wsBaseUrl: string, sessionId: string, accessToken: string): void {
    this.url = `${wsBaseUrl}/api/copilot/sessions/${sessionId}/stream`
    this.accessToken = accessToken
    this.intentionallyClosed = false
    this.retryMs = INITIAL_RETRY_MS
    this.openConnection()
  }

  private openConnection(): void {
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
    }

    try {
      this.ws = new WebSocket(this.url, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.on("open", () => {
      this.retryMs = INITIAL_RETRY_MS
      this.disconnectedAt = null
      this.setHealth("connected")

      if (this.lastReceivedTimestamp) {
        this.ws?.send(JSON.stringify({
          type: "replay_since",
          since: this.lastReceivedTimestamp
        }))
      }
    })

    this.ws.on("message", (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString())
        this.lastReceivedTimestamp = msg.timestamp || new Date().toISOString()

        switch (msg.type) {
          case "transcript_chunk":
            this.emit("transcript", msg)
            break
          case "suggestion":
            this.emit("suggestion", msg)
            break
          case "coverage_update":
            this.emit("coverage", msg)
            break
          default:
            this.emit("message", msg)
        }
      } catch {
        // ignore malformed messages
      }
    })

    this.ws.on("close", (code: number) => {
      if (this.intentionallyClosed) {
        this.setHealth("disconnected")
        return
      }
      this.scheduleReconnect()
    })

    this.ws.on("error", () => {
      // error always fires before close, so reconnect is handled by close
    })
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return

    this.setHealth("reconnecting")
    if (!this.disconnectedAt) {
      this.disconnectedAt = Date.now()
    }

    if (Date.now() - this.disconnectedAt > DISCONNECT_BANNER_MS) {
      this.emit("extended_disconnect")
    }

    if (this.retryTimer) clearTimeout(this.retryTimer)

    this.retryTimer = setTimeout(() => {
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS)
      this.openConnection()
    }, this.retryMs)
  }

  private setHealth(health: ConnectionHealth): void {
    if (this.health !== health) {
      this.health = health
      this.emit("health", health)
    }
  }

  public getHealth(): ConnectionHealth {
    return this.health
  }

  public disconnect(): void {
    this.intentionallyClosed = true
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    this.setHealth("disconnected")
    this.lastReceivedTimestamp = null
  }

  public destroy(): void {
    this.disconnect()
    this.removeAllListeners()
  }
}
