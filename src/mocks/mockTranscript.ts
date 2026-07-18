import type { TranscriptChunk, CompetencyCoverage } from "../types"

export const mockTranscriptChunks: TranscriptChunk[] = [
  { type: "transcript_chunk", speaker: "recruiter", text: "Guten Tag Herr Müller, schön dass Sie da sind. Erzählen Sie mir doch zunächst etwas über Ihre aktuelle Position bei TechCo.", timestamp: "" },
  { type: "transcript_chunk", speaker: "candidate", text: "Vielen Dank! Ich bin seit drei Jahren bei TechCo als Senior Developer tätig. Mein Hauptfokus liegt auf der Backend-Entwicklung mit Java und Spring Boot.", timestamp: "" },
  { type: "transcript_chunk", speaker: "recruiter", text: "Sie haben im Lebenslauf auch Erfahrung mit Microservices erwähnt. Können Sie das genauer beschreiben?", timestamp: "" },
  { type: "transcript_chunk", speaker: "candidate", text: "Ja, bei TechCo haben wir eine große monolithische Anwendung in Microservices aufgeteilt. Ich habe dabei die Architektur entworfen und das Team durch die Migration geleitet.", timestamp: "" },
  { type: "transcript_chunk", speaker: "recruiter", text: "Wie groß war das Team, das Sie dabei geführt haben?", timestamp: "" },
  { type: "transcript_chunk", speaker: "candidate", text: "Wir waren ein Team von 5 Entwicklern. Ich war der technische Lead und habe die Sprint-Planung und Code-Reviews übernommen.", timestamp: "" },
  { type: "transcript_chunk", speaker: "recruiter", text: "Und welche Cloud-Technologien haben Sie dabei eingesetzt?", timestamp: "" },
  { type: "transcript_chunk", speaker: "candidate", text: "Wir haben primär AWS verwendet — ECS für Container, RDS für Datenbanken, und SQS für asynchrone Kommunikation zwischen den Services.", timestamp: "" }
]

export const mockCoverageUpdates: CompetencyCoverage[] = [
  { competencyId: "tech", competencyName: "Technisch", weight: 3, status: "partial", depthScore: 65, relevantTranscriptRanges: [], notes: [] },
  { competencyId: "leadership", competencyName: "Führung", weight: 2, status: "partial", depthScore: 30, relevantTranscriptRanges: [], notes: [] },
  { competencyId: "culture", competencyName: "Kultur-Fit", weight: 2, status: "not_started", depthScore: 0, relevantTranscriptRanges: [], notes: [] },
  { competencyId: "comm", competencyName: "Kommunikation", weight: 1, status: "covered", depthScore: 80, relevantTranscriptRanges: [], notes: [] },
  { competencyId: "problem", competencyName: "Problemlösung", weight: 2, status: "partial", depthScore: 45, relevantTranscriptRanges: [], notes: [] }
]

let transcriptIndex = 0
let transcriptTimer: ReturnType<typeof setInterval> | null = null

export function startMockTranscriptStream(
  onChunk: (chunk: TranscriptChunk) => void,
  intervalMs: number = 5000
): () => void {
  transcriptIndex = 0

  transcriptTimer = setInterval(() => {
    if (transcriptIndex < mockTranscriptChunks.length) {
      onChunk({
        ...mockTranscriptChunks[transcriptIndex],
        timestamp: new Date().toISOString()
      })
      transcriptIndex++
    } else {
      if (transcriptTimer) clearInterval(transcriptTimer)
    }
  }, intervalMs)

  return () => {
    if (transcriptTimer) {
      clearInterval(transcriptTimer)
      transcriptTimer = null
    }
  }
}
