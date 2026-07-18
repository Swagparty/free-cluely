export type SessionStatus = "idle" | "loading" | "active" | "ending" | "summary"
export type ConnectionHealth = "connected" | "reconnecting" | "disconnected"
export type ConsentStatus = "consented" | "not_consented" | "unknown"
export type SessionMode = "recruiting" | "job_intake" | "sales"
export type SuggestionType = "follow_up_question" | "consistency_flag" | "coverage_nudge" | "bias_alert" | "info_lookup"
export type SuggestionPriority = "high" | "medium" | "low"
export type CoverageStatus = "not_started" | "partial" | "covered"
export type OverallFit = "strong_yes" | "yes" | "maybe" | "no" | "strong_no"
export type LicenseTier = "trial" | "pro" | "enterprise"
export type Speaker = "candidate" | "recruiter"

export interface UserProfile {
  id: string
  email: string
  name: string
  organizationId?: string
  kundennummer?: number
  accountId?: string
  projectId?: string
  licenseTier: LicenseTier
  sessionsRemaining?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SSOCredentials {
  ssoToken: string
}

export interface JobContext {
  title: string
  requirements: string[]
  mustHaves: string[]
  niceToHaves: string[]
  salaryRange?: { min: number; max: number; currency: string }
}

export interface CandidateContext {
  name: string
  cvSummary: string
  previousInteractions: string[]
  redFlags: string[]
  strengths: string[]
  salaryExpectation?: string
  currentCompany?: string
  currentTenure?: string
}

export interface CompetencyArea {
  id: string
  name: string
  weight: number
  suggestedQuestions: string[]
}

export interface ScorecardTemplate {
  competencyAreas: CompetencyArea[]
}

export interface RecruiterProfile {
  preferredStyle: string
  avgQuestionCount: number
  commonGaps: string[]
}

export interface SessionStartResponse {
  sessionId: string
  session_id?: string
  jobContext: JobContext
  job_context?: JobContext
  candidateContext: CandidateContext
  candidate_context?: CandidateContext
  scorecardTemplate: ScorecardTemplate
  scorecard_template?: ScorecardTemplate
  recruiterProfile: RecruiterProfile
  consentStatus: ConsentStatus
  consent_status?: ConsentStatus
  notesOnlyMode?: boolean
}

export interface TranscriptChunk {
  type: "transcript_chunk"
  speaker: Speaker
  text: string
  timestamp: string
}

export interface Suggestion {
  id: string
  type: "suggestion"
  suggestionType: SuggestionType
  content: string
  reasoning: string
  priority: SuggestionPriority
  relatedCompetency: string | null
  timestamp: string
}

export interface CoverageUpdate {
  type: "coverage_update"
  areas: CompetencyCoverage[]
}

export interface CompetencyCoverage {
  competencyId: string
  competencyName: string
  weight: number
  status: CoverageStatus
  depthScore: number
  relevantTranscriptRanges: { start: string; end: string }[]
  recruiterRating?: 1 | 2 | 3 | 4 | 5
  notes: string[]
}

export interface RecruiterNote {
  id: string
  text: string
  competencyId?: string
  timestamp: string
}

export interface RecruiterAction {
  action: "dismiss_suggestion" | "use_suggestion" | "add_note" | "flag_candidate" | "mark_competency"
  suggestionId?: string
  noteText?: string
  competencyId?: string
  rating?: 1 | 2 | 3 | 4 | 5
}

export interface CompetencyScore {
  competencyId: string
  suggestedRating: number
  evidence: string
  recruiterOverride?: number
}

export interface ScorecardDraft {
  overallFit: OverallFit
  competencyScores: CompetencyScore[]
  candidateSummary: string
  strengths: string[]
  concerns: string[]
  suggestedNextSteps: string[]
  illegalQuestionFlags: string[]
}

export interface SessionEndResponse {
  scorecardDraft: ScorecardDraft
  summary: string
  followUpActions: string[]
  recruiterPerformance: {
    coverageScore: number
    biasScore: number
    questionQualityScore: number
  }
}

export interface CopilotSession {
  sessionId: string
  status: SessionStatus
  interviewId: string
  jobContext: JobContext | null
  candidateContext: CandidateContext | null
  scorecardTemplate: ScorecardTemplate | null
  coverageState: CompetencyCoverage[]
  suggestions: Suggestion[]
  dismissedSuggestionIds: string[]
  notes: RecruiterNote[]
  startedAt: Date | null
  transcriptBuffer: TranscriptChunk[]
  connectionHealth: ConnectionHealth
  consentStatus: ConsentStatus
}

export interface UpcomingInterview {
  interviewId: string
  jobId: string
  candidateId: string
  candidateName: string
  jobTitle: string
  scheduledAt: string
  recruiterId: string
}

export interface CopilotSettings {
  overlayPosition: "left" | "right"
  transparency: number
  language: "de" | "en"
  soundEnabled: boolean
  darkMode: boolean
  fontSize: number
  betaFeaturesEnabled: boolean
}

export interface ApplicantData {
  id: string
  collection: string
  vorname?: string
  nachname?: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  telefon?: string
  phoneNumber?: string
  mobilnummer?: string
  location?: string
  ort?: string
  stadt?: string
  skills?: string[]
  qualifikationen?: string[]
  experience?: any
  berufserfahrung?: string
  currentEmployer?: string
  arbeitgeber?: string
  jobTitle?: string
  stellenbezeichnung?: string
  cvSummary?: string
  zusammenfassung?: string
  notes?: string
  notizen?: string
  files?: Array<{ fileName?: string; name?: string; downloadURL?: string; url?: string; mimeType?: string }>
  created?: any
  status?: string
  jobOfferId?: string
  archived?: boolean
  language?: string
  quelle?: string
  origin?: string
  [key: string]: any
}

export type WebSocketMessage = TranscriptChunk | { type: "suggestion" } & Suggestion | CoverageUpdate

export interface JobIntakeRequirement {
  id: string
  requirement: string
  category: string
  priority: "must_have" | "nice_to_have"
  notes?: string
  timestamp: string
}

export interface PitchRoadmapStep {
  id: string
  title: string
  description?: string
  status: "pending" | "current" | "completed"
}

export interface PitchChecklistItem {
  id: string
  text: string
  checked: boolean
  category?: string
}

export interface JobIntakeData {
  customerName: string
  companyName?: string
  jobTitle: string
  requirements: JobIntakeRequirement[]
  notes: string
  startedAt: string
  endedAt?: string
  roadmap?: PitchRoadmapStep[]
  pitchChecklist?: PitchChecklistItem[]
}
