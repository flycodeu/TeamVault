"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { updateCredentialAccess } from "@/lib/credential/actions"
import { CredentialSubjectPicker, type CredentialSubjectGrant } from "./credential-subject-picker"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }

export function CredentialAccessEditor({ credentialId, initialMode, initialSubjects, subjects, onDone }: { credentialId: string; initialMode: "RESOURCE" | "RESTRICTED"; initialSubjects: CredentialSubjectGrant[]; subjects: Subject[]; onDone: () => void }) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [selected, setSelected] = useState(initialSubjects)
  const [error, setError] = useState("")

  async function save() {
    const result = await updateCredentialAccess(credentialId, { accessMode: mode, subjects: mode === "RESTRICTED" ? selected : [] })
    if (!result.success) setError(result.error)
    else { router.refresh(); onDone() }
  }

  return <div className="mt-4 space-y-3 border-t pt-4"><div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant={mode === "RESOURCE" ? "default" : "outline"} onClick={() => setMode("RESOURCE")}>沿用模块权限</Button><Button type="button" size="sm" variant={mode === "RESTRICTED" ? "default" : "outline"} onClick={() => setMode("RESTRICTED")}>指定成员</Button></div>{mode === "RESTRICTED" ? <CredentialSubjectPicker subjects={subjects} value={selected} onChange={setSelected} /> : null}{error ? <p className="text-xs text-destructive">{error}</p> : null}<div className="flex gap-2"><Button type="button" size="sm" onClick={save}>保存可见范围</Button><Button type="button" size="sm" variant="ghost" onClick={onDone}>取消</Button></div></div>
}
