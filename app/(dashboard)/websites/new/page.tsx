import { ChevronLeft } from "lucide-react"
import Link from "next/link"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"

export default function NewWebsitePage() {
  return <div className="mx-auto max-w-3xl px-4 py-7 md:px-8 md:py-9"><Button variant="ghost" size="sm" asChild><Link href="/websites"><ChevronLeft />返回网站</Link></Button><div className="mt-6"><h1 className="text-2xl font-semibold">新增网站</h1></div><div className="mt-6 rounded-xl border bg-card p-5 md:p-7"><ResourceForm mode="WEBSITE" /></div></div>
}
