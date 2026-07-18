import React from "react"
import { useTranslation } from "react-i18next"
import { useConnection } from "../hooks/useConnection"

const ConnectionStatus: React.FC = () => {
  const { t } = useTranslation()
  const { connectionHealth } = useConnection()

  const dotColor = {
    connected: "bg-copilot-success",
    reconnecting: "bg-copilot-warning animate-pulse-dot",
    disconnected: "bg-copilot-error"
  }[connectionHealth]

  const label = {
    connected: t("connection.connected"),
    reconnecting: t("connection.reconnecting"),
    disconnected: t("connection.disconnected")
  }[connectionHealth]

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-[10px] text-copilot-text-muted">{label}</span>
    </div>
  )
}

export default ConnectionStatus
