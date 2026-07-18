import { create } from "zustand"
import type {
  SessionStatus,
  ConnectionHealth,
  ConsentStatus,
  JobContext,
  CandidateContext,
  ScorecardTemplate,
  CompetencyCoverage,
  Suggestion,
  RecruiterNote,
  TranscriptChunk,
  ScorecardDraft,
  UserProfile,
  UpcomingInterview,
  SessionEndResponse,
  CopilotSettings,
  ApplicantData
} from "../types"

interface SessionState {
  userProfile: UserProfile | null
  isAuthenticated: boolean
  sessionId: string | null
  status: SessionStatus
  connectionHealth: ConnectionHealth
  consentStatus: ConsentStatus

  jobContext: JobContext | null
  candidateContext: CandidateContext | null
  scorecardTemplate: ScorecardTemplate | null
  coverageState: CompetencyCoverage[]
  suggestions: Suggestion[]
  dismissedSuggestionIds: string[]
  notes: RecruiterNote[]
  transcriptBuffer: TranscriptChunk[]
  startedAt: number | null

  upcomingInterviews: UpcomingInterview[]
  endResponse: SessionEndResponse | null
  notesOnlyMode: boolean

  applicantData: ApplicantData | null
  applicantLoading: boolean
  applicantError: string | null

  settings: CopilotSettings

  setApplicantData: (data: ApplicantData | null) => void
  setApplicantLoading: (loading: boolean) => void
  setApplicantError: (error: string | null) => void
  setCandidateContext: (ctx: CandidateContext) => void
  setStartedAt: (ts: number) => void

  setUserProfile: (profile: UserProfile | null) => void
  setAuthenticated: (auth: boolean) => void
  setStatus: (status: SessionStatus) => void
  setConnectionHealth: (health: ConnectionHealth) => void

  initSession: (data: {
    sessionId: string
    jobContext: JobContext
    candidateContext: CandidateContext
    scorecardTemplate: ScorecardTemplate
    consentStatus: ConsentStatus
    notesOnlyMode?: boolean
  }) => void

  addSuggestion: (suggestion: Suggestion) => void
  dismissSuggestion: (id: string) => void
  useSuggestion: (id: string) => void
  updateCoverage: (areas: CompetencyCoverage[]) => void
  addTranscript: (chunk: TranscriptChunk) => void
  addNote: (note: RecruiterNote) => void
  rateCompetency: (competencyId: string, rating: 1 | 2 | 3 | 4 | 5) => void

  setUpcomingInterviews: (interviews: UpcomingInterview[]) => void
  setEndResponse: (response: SessionEndResponse) => void
  updateSettings: (partial: Partial<CopilotSettings>) => void

  resetSession: () => void
  logout: () => void
}

function loadDarkModePref(): boolean {
  try {
    const stored = localStorage.getItem("mona-dark-mode")
    if (stored === "false") return false
    return true
  } catch {
    return true
  }
}

const defaultSettings: CopilotSettings = {
  overlayPosition: "right",
  transparency: 100,
  language: "de",
  soundEnabled: false,
  darkMode: loadDarkModePref(),
  fontSize: 14,
  betaFeaturesEnabled: false
}

export const useSessionStore = create<SessionState>((set, _get) => ({
  userProfile: null,
  isAuthenticated: false,
  sessionId: null,
  status: "idle",
  connectionHealth: "disconnected",
  consentStatus: "unknown",

  jobContext: null,
  candidateContext: null,
  scorecardTemplate: null,
  coverageState: [],
  suggestions: [],
  dismissedSuggestionIds: [],
  notes: [],
  transcriptBuffer: [],
  startedAt: null,

  upcomingInterviews: [],
  endResponse: null,
  notesOnlyMode: false,

  applicantData: null,
  applicantLoading: false,
  applicantError: null,

  settings: defaultSettings,

  setApplicantData: (data) => set({ applicantData: data, applicantError: null }),
  setApplicantLoading: (loading) => set({ applicantLoading: loading }),
  setApplicantError: (error) => set({ applicantError: error, applicantLoading: false }),
  setCandidateContext: (ctx) => set({ candidateContext: ctx }),
  setStartedAt: (ts) => set({ startedAt: ts }),

  setUserProfile: (profile) => set({ userProfile: profile, isAuthenticated: !!profile }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setStatus: (status) => set({ status }),
  setConnectionHealth: (health) => set({ connectionHealth: health }),

  initSession: (data) => set({
    sessionId: data.sessionId,
    jobContext: data.jobContext,
    candidateContext: data.candidateContext,
    scorecardTemplate: data.scorecardTemplate,
    consentStatus: data.consentStatus,
    notesOnlyMode: data.notesOnlyMode || false,
    coverageState: data.scorecardTemplate.competencyAreas.map((area) => ({
      competencyId: area.id,
      competencyName: area.name,
      weight: area.weight,
      status: "not_started" as const,
      depthScore: 0,
      relevantTranscriptRanges: [],
      notes: []
    })),
    suggestions: [],
    dismissedSuggestionIds: [],
    notes: [],
    transcriptBuffer: [],
    startedAt: Date.now(),
    status: "active",
    endResponse: null
  }),

  addSuggestion: (suggestion) => set((state) => {
    if (state.dismissedSuggestionIds.includes(suggestion.id)) return state
    const exists = state.suggestions.some((s) => s.id === suggestion.id)
    if (exists) return state
    return { suggestions: [suggestion, ...state.suggestions] }
  }),

  dismissSuggestion: (id) => set((state) => ({
    dismissedSuggestionIds: [...state.dismissedSuggestionIds, id],
    suggestions: state.suggestions.filter((s) => s.id !== id)
  })),

  useSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.filter((s) => s.id !== id)
  })),

  updateCoverage: (areas) => set({ coverageState: areas }),

  addTranscript: (chunk) => set((state) => {
    const buffer = [...state.transcriptBuffer, chunk]
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    return { transcriptBuffer: buffer.filter((c) => c.timestamp > fiveMinAgo) }
  }),

  addNote: (note) => set((state) => ({
    notes: [...state.notes, note]
  })),

  rateCompetency: (competencyId, rating) => set((state) => ({
    coverageState: state.coverageState.map((c) =>
      c.competencyId === competencyId ? { ...c, recruiterRating: rating } : c
    )
  })),

  setUpcomingInterviews: (interviews) => set({ upcomingInterviews: interviews }),
  setEndResponse: (response) => set({ endResponse: response, status: "summary" }),

  updateSettings: (partial) => set((state) => ({
    settings: { ...state.settings, ...partial }
  })),

  resetSession: () => set({
    sessionId: null,
    status: "idle",
    jobContext: null,
    candidateContext: null,
    scorecardTemplate: null,
    coverageState: [],
    suggestions: [],
    dismissedSuggestionIds: [],
    notes: [],
    transcriptBuffer: [],
    startedAt: null,
    connectionHealth: "disconnected",
    consentStatus: "unknown",
    endResponse: null,
    notesOnlyMode: false,
    applicantData: null,
    applicantLoading: false,
    applicantError: null
  }),

  logout: () => set({
    userProfile: null,
    isAuthenticated: false,
    sessionId: null,
    status: "idle",
    jobContext: null,
    candidateContext: null,
    scorecardTemplate: null,
    coverageState: [],
    suggestions: [],
    dismissedSuggestionIds: [],
    notes: [],
    transcriptBuffer: [],
    startedAt: null,
    connectionHealth: "disconnected",
    consentStatus: "unknown",
    upcomingInterviews: [],
    endResponse: null,
    notesOnlyMode: false,
    applicantData: null,
    applicantLoading: false,
    applicantError: null
  })
}))
