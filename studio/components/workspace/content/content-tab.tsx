"use client"

import { m } from "framer-motion"
import { fadeInUp } from "@/lib/animation/variants"
import { ContentLibrary } from "@/components/workspace/publish/content-library"
import { WarRoomList } from "./war-room"

export function ContentTab() {
  return (
    <m.div
      data-demo-id="content-tab"
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className="h-full min-h-0 overflow-auto p-4 lg:p-5"
    >
      <div className="mx-auto max-w-[1500px]">
        <WarRoomList />
        <ContentLibrary />
      </div>
    </m.div>
  )
}
