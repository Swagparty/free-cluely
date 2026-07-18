const API_BASE = process.env.MONA_API_URL || "https://api.mona-ai.cloud"

export class MonaApiClient {
  private apiKey: string | null = null

  public setApiKey(key: string): void {
    this.apiKey = key
  }

  public getApiKey(): string | null {
    return this.apiKey
  }

  public clearApiKey(): void {
    this.apiKey = null
  }

  private async request(path: string, endpoint: string, body: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) throw new Error("Not authenticated")

    const url = `${API_BASE}${path}`
    console.log(`[MonaAPI] POST ${url} endpoint=${endpoint} keyLen=${this.apiKey.length}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ endpoint, apiKey: this.apiKey, ...body })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      console.error(`[MonaAPI] ${response.status} ${response.statusText}: ${errBody}`)
      if (response.status === 401) {
        throw new Error("Sitzung abgelaufen. Bitte melden Sie sich erneut an.")
      }
      throw new Error(`Ein Fehler ist aufgetreten (${response.status}). Bitte versuchen Sie es erneut.`)
    }

    const data = await response.json()
    console.log(`[MonaAPI] Response for ${endpoint}:`, JSON.stringify(data).substring(0, 500))
    return data
  }

  public async validateKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.request("/database", "getApplicantsCount")
      return { valid: true }
    } catch (err: any) {
      return { valid: false, error: err.message }
    }
  }

  public async getApplicants(paginationToken?: string): Promise<any> {
    return this.request("/database", "getApplicantsFromDatabase", {
      ...(paginationToken ? { paginationToken } : {})
    })
  }

  public async getEmailApplicants(paginationToken?: string): Promise<any> {
    return this.request("/database", "getEmailapplicantsFromDatabase", {
      ...(paginationToken ? { paginationToken } : {})
    })
  }

  public async getFinishedApplicants(): Promise<any> {
    return this.request("/database", "getFinishedApplicantsFromDatabase")
  }

  public async getApplicantFile(applicantId: string, fileIndex: number, collection?: string): Promise<any> {
    return this.request("/database", "getApplicantFile", {
      applicantId,
      fileIndex,
      ...(collection ? { collection } : {})
    })
  }

  public async getApplicantsCount(): Promise<any> {
    return this.request("/database", "getApplicantsCount")
  }

  public async getJobOffers(): Promise<any> {
    return this.request("/database", "getJobOffersFromDatabase")
  }

  public async callAgent(endpoint: string, body: Record<string, any> = {}): Promise<any> {
    return this.request("/agent", endpoint, body)
  }

  public async createApplicant(data: Record<string, any>): Promise<any> {
    return this.request("/database", "pushApplicantsToApplicants", {
      applicants: [data]
    })
  }

  public async parseCV(documentData: string, applicantId: string): Promise<any> {
    if (!this.apiKey) throw new Error("Not authenticated")

    const url = `${API_BASE}/parsing`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "parseCV",
        apiKey: this.apiKey,
        documentData,
        applicantId
      })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`CV parsing failed (${response.status}): ${errBody}`)
    }

    return response.json()
  }

  public async updateApplicantNotes(applicantId: string, userNotes: string): Promise<any> {
    return this.request("/database", "pushApplicantsToApplicants", {
      applicants: [{ id: applicantId, userNotes }]
    })
  }

  public async saveInterview(applicantId: string, interviewData: any): Promise<any> {
    return this.request("/database", "pushApplicantsToApplicants", {
      applicants: [{
        id: applicantId,
        monaLiveInterviews: interviewData
      }]
    })
  }

  public async getTranscriptionKey(): Promise<{ success: boolean; key?: string; provider?: string; error?: string }> {
    try {
      const result = await this.requestLiveInterview("getTranscriptionKey")
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  private async requestLiveInterview(endpoint: string, body: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) throw new Error("Not authenticated")

    const url = `${API_BASE}/liveInterview`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ endpoint, apiKey: this.apiKey, ...body })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`API error (${response.status}): ${errBody}`)
    }

    return response.json()
  }

  public async transcribeAndAnalyze(
    audioBase64: string,
    mimeType: string,
    candidateContext: any,
    previousTranscript: string
  ): Promise<any> {
    if (!this.apiKey) throw new Error("Not authenticated")

    const url = `${API_BASE}/liveInterview`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "transcribeAndAnalyze",
        audioBase64,
        mimeType,
        candidateContext,
        previousTranscript
      })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`Transcription failed (${response.status}): ${errBody}`)
    }

    return response.json()
  }

  public async analyzeInterview(
    transcript: string,
    candidateContext: any,
    onPartial?: (text: string) => void
  ): Promise<any> {
    if (!this.apiKey) throw new Error("Not authenticated")

    const url = `${API_BASE}/liveInterview`
    console.log(`[MonaAPI] POST ${url} endpoint=stream (streaming)`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "stream", apiKey: this.apiKey, transcript, candidateContext,
        customPrompt: candidateContext.customPrompt || "",
        jobPosting: candidateContext.jobPosting || "",
        checklist: candidateContext.checklist || []
      })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      return { success: false, suggestions: [], error: `API error (${response.status})` }
    }

    let fullText = ""
    let suggestions: any[] = []
    let checklistUpdates: any[] = []

    if (response.body && onPartial) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter(Boolean)

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6))
              if (data.partial) {
                fullText += data.partial
                onPartial(fullText)
              }
              if (data.suggestions && Array.isArray(data.suggestions)) {
                suggestions = data.suggestions
              }
              if (data.checklistUpdates && Array.isArray(data.checklistUpdates)) {
                checklistUpdates = data.checklistUpdates
              }
            } catch {}
          }
        }
      }
    } else {
      const text = await response.text()
      fullText = text
      const lines = text.split("\n").filter(Boolean)
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6))
            if (data.partial) fullText += data.partial
            if (data.suggestions && Array.isArray(data.suggestions)) suggestions = data.suggestions
            if (data.checklistUpdates && Array.isArray(data.checklistUpdates)) checklistUpdates = data.checklistUpdates
          } catch {}
        }
      }
    }

    if ((suggestions.length === 0 || checklistUpdates.length === 0) && fullText.includes("{")) {
      try {
        const cleaned = fullText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed)) {
          suggestions = parsed
        } else if (parsed.suggestions) {
          suggestions = parsed.suggestions || []
          checklistUpdates = parsed.checklistUpdates || []
        }
      } catch {
        try {
          const arrMatch = fullText.match(/\[[\s\S]*\]/)
          if (arrMatch) {
            const parsed = JSON.parse(arrMatch[0])
            if (Array.isArray(parsed)) suggestions = parsed
          }
        } catch {}
      }
    }

    console.log(`[MonaAPI] stream result: ${suggestions.length} suggestions, ${checklistUpdates.length} checklist updates`)
    return { success: true, suggestions, checklistUpdates }
  }

  public async extractRequirements(jobPosting: string, candidateProfile: string): Promise<any> {
    return this.requestLiveInterview("extractRequirements", { jobPosting, candidateProfile })
  }

  public async generateScorecard(
    transcript: string,
    candidateName: string,
    onPartial?: (text: string) => void
  ): Promise<any> {
    console.log(`[MonaAPI] generateScorecard called, transcript length: ${transcript.length}`)
    try {
      const result = await this.requestLiveInterview("scorecard", { transcript, candidateName })
      console.log(`[MonaAPI] scorecard result: success=${result.success}, hasScorecard=${!!result.scorecard}`)
      return result
    } catch (err: any) {
      console.error(`[MonaAPI] scorecard error: ${err.message}`)
      return { success: false, error: err.message }
    }
  }
}
