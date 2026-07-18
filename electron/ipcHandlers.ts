import { ipcMain, app, dialog } from "electron"
import fs from "node:fs"
import path from "node:path"
import { v4 as uuidv4 } from "uuid"
import type { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle("auth:login", async (_event, key: string) => {
    return appState.auth.loginWithKey(key)
  })

  ipcMain.handle("auth:logout", async () => {
    appState.session.resetToIdle()
    appState.auth.logout()
  })

  ipcMain.handle("auth:open-platform", async () => {
    appState.openPlatformLogin()
  })

  ipcMain.handle("auth:check", async () => {
    return { authenticated: appState.auth.isAuthenticated() }
  })

  ipcMain.handle("applicant:list", async () => {
    try {
      return await appState.auth.api.getApplicants()
    } catch (err: any) {
      console.error("[IPC] applicant:list error:", err.message)
      return { data: [], pagination: { total: 0 } }
    }
  })

  ipcMain.handle("applicant:list-email", async () => {
    try {
      return await appState.auth.api.getEmailApplicants()
    } catch (err: any) {
      console.error("[IPC] applicant:list-email error:", err.message)
      return { data: [], pagination: { total: 0 } }
    }
  })

  ipcMain.handle("applicant:file", async (_event, applicantId: string, fileIndex: number, collection?: string) => {
    try {
      return await appState.auth.api.getApplicantFile(applicantId, fileIndex, collection)
    } catch (err: any) {
      console.error("[IPC] applicant:file error:", err.message)
      return null
    }
  })

  ipcMain.handle("applicant:create", async (_event, data: Record<string, any>) => {
    try {
      return await appState.auth.api.createApplicant(data)
    } catch (err: any) {
      console.error("[IPC] applicant:create error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("applicant:upload-cv", async () => {
    try {
      const mainWindow = appState.getMainWindow()
      if (!mainWindow) return { success: false, error: "No window" }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: "CV auswählen",
        filters: [
          { name: "Dokumente", extensions: ["pdf", "doc", "docx", "txt", "rtf"] }
        ],
        properties: ["openFile"]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      const fileBuffer = fs.readFileSync(filePath)
      const documentData = fileBuffer.toString("base64")
      const applicantId = uuidv4()

      const parseResult = await appState.auth.api.parseCV(documentData, applicantId)

      if (parseResult && parseResult.applicantData) {
        await appState.auth.api.createApplicant({
          id: applicantId,
          ...parseResult.applicantData,
          source: "mona-live-cv-upload",
          fileName: path.basename(filePath)
        })
      } else if (parseResult && !parseResult.error) {
        await appState.auth.api.createApplicant({
          id: applicantId,
          ...parseResult,
          source: "mona-live-cv-upload",
          fileName: path.basename(filePath)
        })
      }

      return { success: true, applicantId, parseResult }
    } catch (err: any) {
      console.error("[IPC] applicant:upload-cv error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("applicant:update-notes", async (_event, applicantId: string, userNotes: string) => {
    try {
      return await appState.auth.api.updateApplicantNotes(applicantId, userNotes)
    } catch (err: any) {
      console.error("[IPC] applicant:update-notes error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("live:extract-requirements", async (_event, jobPosting: string, candidateProfile: string) => {
    try {
      return await appState.auth.api.extractRequirements(jobPosting, candidateProfile)
    } catch (err: any) {
      return { success: false, requirements: [], error: err.message }
    }
  })

  ipcMain.handle("interview:save", async (_event, applicantId: string, interviewData: any) => {
    try {
      return await appState.auth.api.saveInterview(applicantId, interviewData)
    } catch (err: any) {
      console.error("[IPC] interview:save error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("joboffers:list", async () => {
    try {
      return await appState.auth.api.getJobOffers()
    } catch (err: any) {
      console.error("[IPC] joboffers:list error:", err.message)
      return { data: [] }
    }
  })

  ipcMain.handle("live:start", async () => {
    try {
      await appState.audioCapture.startCapture()
      return { success: true }
    } catch (err: any) {
      console.error("[IPC] live:start error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("live:stop", async () => {
    try {
      appState.audioCapture.stopCapture()
      return { success: true }
    } catch (err: any) {
      console.error("[IPC] live:stop error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("live:get-transcription-key", async () => {
    try {
      return await appState.auth.api.getTranscriptionKey()
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("live:transcribe", async (_event, audioBase64: string, mimeType: string, candidateContext: any, previousTranscript: string) => {
    try {
      return await appState.auth.api.transcribeAndAnalyze(audioBase64, mimeType, candidateContext, previousTranscript)
    } catch (err: any) {
      console.error("[IPC] live:transcribe error:", err.message)
      return { success: false, transcript: "", suggestions: [], error: err.message }
    }
  })

  ipcMain.handle("live:analyze", async (_event, transcript: string, candidateContext: any) => {
    try {
      const mainWindow = appState.getMainWindow()
      const result = await appState.auth.api.analyzeInterview(transcript, candidateContext, (partialText: string) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("live:stream-partial", partialText)
        }
      })
      return result
    } catch (err: any) {
      console.error("[IPC] live:analyze error:", err.message)
      return { success: false, suggestions: [], error: err.message }
    }
  })

  ipcMain.handle("live:generate-scorecard", async (_event, transcript: string, candidateName: string) => {
    try {
      return await appState.auth.api.generateScorecard(transcript, candidateName)
    } catch (err: any) {
      console.error("[IPC] live:generate-scorecard error:", err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle("settings:get", async () => {
    return appState.getSettings()
  })

  ipcMain.handle("settings:update", async (_event, settings: any) => {
    appState.updateSettings(settings)
  })

  ipcMain.handle("app:quit", () => {
    app.quit()
  })

  ipcMain.handle("window:toggle", () => {
    appState.windowHelper.toggleMainWindow()
  })
}
