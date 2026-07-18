import type { Suggestion, SessionEndResponse } from "../types"

export const mockSuggestions: Suggestion[] = [
  {
    id: "sug-001",
    type: "suggestion",
    suggestionType: "consistency_flag",
    content: "Kandidat erwähnte 5 Jahre bei SAP, aber der Lebenslauf zeigt nur 3 Jahre. Nachfragen empfohlen.",
    reasoning: "Diskrepanz zwischen mündlicher Angabe und CV-Daten bei der Berufserfahrung",
    priority: "high",
    relatedCompetency: "tech",
    timestamp: new Date().toISOString()
  },
  {
    id: "sug-002",
    type: "suggestion",
    suggestionType: "follow_up_question",
    content: "Kandidat erwähnte Migration zu Microservices — fragen Sie nach den konkreten Herausforderungen und wie diese gelöst wurden.",
    reasoning: "Tiefere Einblicke in praktische Erfahrung mit Microservices-Architekturen",
    priority: "medium",
    relatedCompetency: "tech",
    timestamp: new Date().toISOString()
  },
  {
    id: "sug-003",
    type: "suggestion",
    suggestionType: "coverage_nudge",
    content: "Noch keine Fragen zum Bereich Teamführung gestellt. Die Scorecard erfordert eine Bewertung in diesem Bereich.",
    reasoning: "Kompetenzbereich 'Führung' ist nach 15 Minuten noch nicht angesprochen worden",
    priority: "medium",
    relatedCompetency: "leadership",
    timestamp: new Date().toISOString()
  },
  {
    id: "sug-004",
    type: "suggestion",
    suggestionType: "bias_alert",
    content: "Vorsicht: Die letzte Frage könnte auf das Alter des Kandidaten abzielen. Dies ist nach AGG nicht zulässig.",
    reasoning: "Fragen zum Alter sind nach dem Allgemeinen Gleichbehandlungsgesetz (AGG) in EU-Interviews unzulässig",
    priority: "high",
    relatedCompetency: null,
    timestamp: new Date().toISOString()
  },
  {
    id: "sug-005",
    type: "suggestion",
    suggestionType: "info_lookup",
    content: "Kandidat arbeitete bei TechCo GmbH — laut MONA-Daten nutzt dieses Unternehmen ebenfalls Spring Boot und Kubernetes.",
    reasoning: "Relevante Hintergrundinformation aus dem Firmenprofil",
    priority: "low",
    relatedCompetency: "tech",
    timestamp: new Date().toISOString()
  }
]

export const mockEndResponse: SessionEndResponse = {
  scorecardDraft: {
    overallFit: "yes",
    competencyScores: [
      { competencyId: "tech", suggestedRating: 4, evidence: "Starke Java/Spring-Kenntnisse demonstriert. Detaillierte Antworten zu Microservices und Cloud-Migration." },
      { competencyId: "leadership", suggestedRating: 3, evidence: "Erwähnte Teamleitung bei TechCo, aber wenig konkrete Beispiele." },
      { competencyId: "culture", suggestedRating: 3, evidence: "Betonte Wichtigkeit von Teamarbeit und offener Kommunikation." },
      { competencyId: "comm", suggestedRating: 4, evidence: "Klare und strukturierte Kommunikation während des gesamten Interviews." },
      { competencyId: "problem", suggestedRating: 4, evidence: "Beschrieb detailliert die Lösung eines komplexen Migrationsprojekts." }
    ],
    candidateSummary: "Max Müller ist ein technisch starker Kandidat mit solider Java/Spring-Erfahrung. Er zeigte gute Kommunikationsfähigkeiten und einen pragmatischen Problemlösungsansatz. Die Führungserfahrung könnte in einer zweiten Runde vertieft werden.",
    strengths: [
      "Tiefes technisches Wissen in Java/Spring/Microservices",
      "Praxiserfahrung mit Cloud-Migration (AWS)",
      "Strukturierte und klare Kommunikation",
      "Pragmatischer Problemlösungsansatz"
    ],
    concerns: [
      "Lücke im Lebenslauf 2022–2023 nicht vollständig erklärt",
      "Führungserfahrung wurde nur oberflächlich besprochen",
      "Gehaltserwartung am oberen Ende des Budgets"
    ],
    suggestedNextSteps: [
      "Zweites Interview mit Fokus auf Teamführung und Kultur-Fit",
      "Technische Coding-Challenge ansetzen",
      "Referenzen von TechCo einholen"
    ],
    illegalQuestionFlags: []
  },
  summary: "45-minütiges Interview für Senior Java Developer. Technisch überzeugendes Gespräch mit Fokus auf Java/Spring und Cloud-Erfahrung. Führungskompetenz sollte vertieft werden.",
  followUpActions: [
    "Zweites Interview planen",
    "Coding-Challenge senden",
    "Referenzen anfordern"
  ],
  recruiterPerformance: {
    coverageScore: 72,
    biasScore: 95,
    questionQualityScore: 81
  }
}

let suggestionIndex = 0
let suggestionTimer: ReturnType<typeof setInterval> | null = null

export function startMockSuggestionStream(
  onSuggestion: (suggestion: Suggestion) => void,
  intervalMs: number = 8000
): () => void {
  suggestionIndex = 0

  suggestionTimer = setInterval(() => {
    if (suggestionIndex < mockSuggestions.length) {
      onSuggestion({
        ...mockSuggestions[suggestionIndex],
        timestamp: new Date().toISOString()
      })
      suggestionIndex++
    } else {
      if (suggestionTimer) clearInterval(suggestionTimer)
    }
  }, intervalMs)

  return () => {
    if (suggestionTimer) {
      clearInterval(suggestionTimer)
      suggestionTimer = null
    }
  }
}
