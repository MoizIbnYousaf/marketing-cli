"use client"

import { m } from "framer-motion"
import { FileText, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { scaleIn } from "@/lib/animation/variants"

export const ReportHeader = ({
  agentName,
  briefDate,
  briefType,
  status,
}: {
  agentName: string
  briefDate?: string
  briefType?: string
  status?: string
}) => (
  <m.div
    variants={scaleIn}
    className="flex items-center justify-between pb-3 border-b border-border/40"
  >
    <div className="flex items-center gap-2">
      <FileText className="size-4 text-accent" />
      <h2 className="text-sm font-semibold text-foreground">{agentName}</h2>
      {briefType && (
        <Badge variant="outline" className="text-[10px] font-normal capitalize">
          {briefType}
        </Badge>
      )}
    </div>
    <div className="flex items-center gap-2">
      {briefDate && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {briefDate}
        </span>
      )}
      {status && (
        <Badge
          variant="outline"
          className={
            status === "completed"
              ? "text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "text-[10px]"
          }
        >
          {status}
        </Badge>
      )}
    </div>
  </m.div>
)
