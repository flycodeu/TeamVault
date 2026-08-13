"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { Credential } from "@/lib/db/schema"
import { CredentialCard } from "./credential-card"
import { CredentialForm } from "./credential-form"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type AccessGrant = { credentialId: string; subjectType: "USER" | "GROUP"; subjectId: string }

export function CredentialSection({ resourceId, credentials, subjects, accessGrants, mayEdit }: { resourceId: string; credentials: Credential[]; subjects: Subject[]; accessGrants: AccessGrant[]; mayEdit: boolean }) {
  const [adding, setAdding] = useState(false)
  return <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">账号与密钥</h2>{credentials.length ? <span className="text-xs text-muted-foreground">{credentials.length}</span> : null}</div>{mayEdit ? <Button type="button" size="sm" onClick={() => setAdding(value => !value)}>{adding ? <X /> : <Plus />}{adding ? "取消" : "新增"}</Button> : null}</div>{adding ? <div className="mt-4 border-t pt-4"><CredentialForm resourceId={resourceId} subjects={subjects} /></div> : null}{credentials.length ? <div className="mt-4 space-y-3">{credentials.map(credential => <CredentialCard key={credential.id} credential={credential} mayEdit={mayEdit} subjects={subjects} accessGrants={accessGrants.filter(grant => grant.credentialId === credential.id).map(grant => ({ subjectType: grant.subjectType, subjectId: grant.subjectId }))} />)}</div> : null}</section>
}
