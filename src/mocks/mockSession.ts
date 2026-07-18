import type { UpcomingInterview, SessionStartResponse } from "../types"

export const mockUpcomingInterviews: UpcomingInterview[] = [
  {
    interviewId: "int-001",
    jobId: "job-001",
    candidateId: "cand-001",
    candidateName: "Max Müller",
    jobTitle: "Senior Java Developer",
    scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recruiterId: "rec-001"
  },
  {
    interviewId: "int-002",
    jobId: "job-002",
    candidateId: "cand-002",
    candidateName: "Anna Schmidt",
    jobTitle: "Product Manager",
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    recruiterId: "rec-001"
  },
  {
    interviewId: "int-003",
    jobId: "job-003",
    candidateId: "cand-003",
    candidateName: "Lena Weber",
    jobTitle: "Data Engineer (Remote)",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    recruiterId: "rec-001"
  }
]

export const mockSessionStart: SessionStartResponse = {
  sessionId: "sess-001",
  jobContext: {
    title: "Senior Java Developer",
    requirements: [
      "5+ Jahre Java/Spring-Erfahrung",
      "Microservices-Architektur",
      "CI/CD-Pipelines",
      "Cloud-Erfahrung (AWS/Azure)"
    ],
    mustHaves: ["Java", "Spring Boot", "REST APIs", "SQL"],
    niceToHaves: ["Kubernetes", "Kafka", "React"],
    salaryRange: { min: 65000, max: 85000, currency: "EUR" }
  },
  candidateContext: {
    name: "Max Müller",
    cvSummary: "Erfahrener Backend-Entwickler mit 6 Jahren Berufserfahrung, Schwerpunkt Java/Spring. " +
      "Zuletzt bei TechCo als Senior Developer tätig. Starke Kenntnisse in Microservices und Cloud-Migration.",
    previousInteractions: ["Erstgespräch am 15.04.2026 — positiver Eindruck, technisch kompetent"],
    redFlags: ["Lücke im Lebenslauf: 2022–2023", "Häufige Jobwechsel (3 Stellen in 4 Jahren)"],
    strengths: ["Java", "Spring Boot", "Microservices", "AWS", "Teamführung"],
    salaryExpectation: "€75.000",
    currentCompany: "TechCo GmbH",
    currentTenure: "3 Jahre"
  },
  scorecardTemplate: {
    competencyAreas: [
      { id: "tech", name: "Technisch", weight: 3, suggestedQuestions: [
        "Beschreiben Sie Ihre Erfahrung mit Microservices-Architektur.",
        "Wie gehen Sie mit Legacy-Code um?"
      ]},
      { id: "leadership", name: "Führung", weight: 2, suggestedQuestions: [
        "Erzählen Sie von einer Situation, in der Sie ein Team geführt haben.",
        "Wie lösen Sie Konflikte im Team?"
      ]},
      { id: "culture", name: "Kultur-Fit", weight: 2, suggestedQuestions: [
        "Was ist Ihnen bei der Unternehmenskultur wichtig?",
        "Wie arbeiten Sie am liebsten?"
      ]},
      { id: "comm", name: "Kommunikation", weight: 1, suggestedQuestions: [
        "Wie erklären Sie technische Konzepte an nicht-technische Stakeholder?"
      ]},
      { id: "problem", name: "Problemlösung", weight: 2, suggestedQuestions: [
        "Beschreiben Sie ein schwieriges technisches Problem, das Sie gelöst haben."
      ]}
    ]
  },
  recruiterProfile: {
    preferredStyle: "structured",
    avgQuestionCount: 12,
    commonGaps: ["Kultur-Fit-Fragen werden oft übersprungen"]
  },
  consentStatus: "consented"
}
