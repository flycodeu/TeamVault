"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { Credential } from "@/lib/db/schema"
import { CredentialCard } from "./credential-card"
import { CredentialForm } from "./credential-form"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type AccessGrant = { credentialId: string; subjectType: "USER" | "GROUP"; subjectId: string }

export function CredentialSection({
  resourceId,
  credentials,
  subjects,
  accessGrants,
  mayEdit,
}: {
  resourceId: string
  credentials: Credential[]
  subjects: Subject[]
  accessGrants: AccessGrant[]
  mayEdit: boolean
}) {
  const [adding, setAdding] = useState(false)

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">账号与密钥凭据</h2>
          {credentials.length ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {credentials.length}
            </span>
          ) : null}
        </div>

        {mayEdit ? (
          <Button
            type="button"
            size="sm"
            variant={adding ? "outline" : "default"}
            onClick={() => setAdding(value => !value)}
            className="h-8 text-xs font-medium gap-1.5"
          >
            {adding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            <span>{adding ? "收起表单" : "新增账号凭据"}</span>
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="pt-2">
          <CredentialForm
            resourceId={resourceId}
            subjects={subjects}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}

      {credentials.length ? (
        <div className="space-y-3 pt-1">
          {credentials.map(credential => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              mayEdit={mayEdit}
              subjects={subjects}
              accessGrants={accessGrants
                .filter(grant => grant.credentialId === credential.id)
                .map(grant => ({ subjectType: grant.subjectType, subjectId: grant.subjectId }))}
            />
          ))}
        </div>
      ) : !adding ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">暂未录入账号与密钥</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            可添加团队开发账号、服务器 SSH、数据库连接或 API Key 凭据
          </p>
        </div>
      ) : null}
    </section>
  )
}

