import type { CopilotSettings } from "./index"

export interface MonaCopilotAPI {
  login: (apiKey: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  openPlatformLogin: () => Promise<void>
  checkAuth: () => Promise<{ authenticated: boolean }>

  getApplicants: () => Promise<{ data: any[]; pagination: { total: number; nextPageToken?: string } }>
  getEmailApplicants: () => Promise<{ data: any[]; pagination: { total: number; nextPageToken?: string } }>
  getApplicantFile: (applicantId: string, fileIndex: number, collection?: string) => Promise<any>
  createApplicant: (data: Record<string, any>) => Promise<any>
  uploadCV: () => Promise<{ success: boolean; canceled?: boolean; applicantId?: string; parseResult?: any; error?: string }>
  updateApplicantNotes: (applicantId: string, userNotes: string) => Promise<any>
  extractRequirements: (jobPosting: string, candidateProfile: string) => Promise<{ success: boolean; requirements?: any[]; error?: string }>
  saveInterview: (applicantId: string, interviewData: any) => Promise<any>
  getJobOffers: () => Promise<{ data: any[] }>
  getUpcomingInterviews: () => Promise<any[]>

  startLiveSession: () => Promise<{ success: boolean; error?: string }>
  stopLiveSession: () => Promise<{ success: boolean; error?: string }>
  startSession: (sessionId: string, candidateInfo?: any) => Promise<any>
  endSession: (sessionId: string) => Promise<any>
  sendAction: (sessionId: string, action: any) => Promise<{ success: boolean; error?: string }>
  getDesktopSources: () => Promise<Array<{ id: string; name: string }>>
  enableLoopbackAudio: () => Promise<void>
  disableLoopbackAudio: () => Promise<void>
  getTranscriptionKey: () => Promise<{ success: boolean; key?: string; provider?: string; error?: string }>
  transcribeAndAnalyze: (audioBase64: string, mimeType: string, candidateContext: any, previousTranscript: string) => Promise<{ success: boolean; transcript?: string; suggestions?: any[]; error?: string }>
  analyzeTranscript: (transcript: string, candidateContext: any) => Promise<{ success: boolean; suggestions?: any[]; checklistUpdates?: any[]; error?: string }>
  generateScorecard: (transcript: string, candidateName: string) => Promise<{ success: boolean; scorecard?: any; error?: string }>

  onStreamPartial: (callback: (text: string) => void) => () => void
  onCoverageUpdate: (callback: (update: any) => void) => () => void

  onDeepLink: (callback: (data: { success: boolean; error?: string }) => void) => () => void
  onSuggestion: (callback: (suggestion: any) => void) => () => void
  onTranscript: (callback: (chunk: any) => void) => () => void
  onConnectionChange: (callback: (status: string) => void) => () => void
  onAuthExpired: (callback: () => void) => () => void

  getSettings: () => Promise<CopilotSettings>
  updateSettings: (settings: Partial<CopilotSettings>) => Promise<void>

  quitApp: () => Promise<void>
  toggleWindow: () => Promise<void>
}

declare global {
  interface Window {
    monacopilot?: MonaCopilotAPI
  }
}
