import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("monacopilot", {
  login: (key: string) => ipcRenderer.invoke("auth:login", key),
  logout: () => ipcRenderer.invoke("auth:logout"),
  openPlatformLogin: () => ipcRenderer.invoke("auth:open-platform"),
  checkAuth: () => ipcRenderer.invoke("auth:check"),

  getApplicants: () => ipcRenderer.invoke("applicant:list"),
  getEmailApplicants: () => ipcRenderer.invoke("applicant:list-email"),
  getApplicantFile: (applicantId: string, fileIndex: number, collection?: string) =>
    ipcRenderer.invoke("applicant:file", applicantId, fileIndex, collection),
  createApplicant: (data: Record<string, any>) =>
    ipcRenderer.invoke("applicant:create", data),
  uploadCV: () => ipcRenderer.invoke("applicant:upload-cv"),
  updateApplicantNotes: (applicantId: string, userNotes: string) =>
    ipcRenderer.invoke("applicant:update-notes", applicantId, userNotes),
  extractRequirements: (jobPosting: string, candidateProfile: string) =>
    ipcRenderer.invoke("live:extract-requirements", jobPosting, candidateProfile),
  saveInterview: (applicantId: string, interviewData: any) =>
    ipcRenderer.invoke("interview:save", applicantId, interviewData),
  getJobOffers: () => ipcRenderer.invoke("joboffers:list"),

  startLiveSession: () => ipcRenderer.invoke("live:start"),
  stopLiveSession: () => ipcRenderer.invoke("live:stop"),
  getDesktopSources: () => ipcRenderer.invoke("audio:get-desktop-sources"),
  enableLoopbackAudio: () => ipcRenderer.invoke("audio:enable-loopback"),
  disableLoopbackAudio: () => ipcRenderer.invoke("audio:disable-loopback"),
  getTranscriptionKey: () => ipcRenderer.invoke("live:get-transcription-key"),
  transcribeAndAnalyze: (audioBase64: string, mimeType: string, candidateContext: any, previousTranscript: string) =>
    ipcRenderer.invoke("live:transcribe", audioBase64, mimeType, candidateContext, previousTranscript),
  analyzeTranscript: (transcript: string, candidateContext: any) =>
    ipcRenderer.invoke("live:analyze", transcript, candidateContext),
  generateScorecard: (transcript: string, candidateName: string) =>
    ipcRenderer.invoke("live:generate-scorecard", transcript, candidateName),

  onStreamPartial: (callback: (text: string) => void) => {
    const handler = (_: any, data: string) => callback(data)
    ipcRenderer.on("live:stream-partial", handler)
    return () => ipcRenderer.removeListener("live:stream-partial", handler)
  },

  onDeepLink: (callback: (data: { success: boolean; error?: string }) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on("auth:deep-link", handler)
    return () => ipcRenderer.removeListener("auth:deep-link", handler)
  },

  onSuggestion: (callback: (suggestion: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on("suggestion:new", handler)
    return () => ipcRenderer.removeListener("suggestion:new", handler)
  },

  onTranscript: (callback: (chunk: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on("transcript:chunk", handler)
    return () => ipcRenderer.removeListener("transcript:chunk", handler)
  },

  onConnectionChange: (callback: (status: string) => void) => {
    const handler = (_: any, data: string) => callback(data)
    ipcRenderer.on("connection:status", handler)
    return () => ipcRenderer.removeListener("connection:status", handler)
  },

  onAuthExpired: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on("auth:expired", handler)
    return () => ipcRenderer.removeListener("auth:expired", handler)
  },

  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: any) => ipcRenderer.invoke("settings:update", settings),

  quitApp: () => ipcRenderer.invoke("app:quit"),
  toggleWindow: () => ipcRenderer.invoke("window:toggle")
})
