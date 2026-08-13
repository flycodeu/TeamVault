import { ChevronLeft } from "lucide-react"
import Link from "next/link"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"

export default function NewResourcePage() {
  return <div className="mx-auto max-w-3xl px-4 py-7 md:px-8 md:py-9"><Button variant="ghost" size="sm" asChild><Link href="/resources"><ChevronLeft />模块列表</Link></Button><div className="mt-6"><h1 className="text-2xl font-semibold">新建模块</h1></div><div className="mt-7 rounded-lg border bg-card p-5 md:p-7"><ResourceForm /></div></div>
}
