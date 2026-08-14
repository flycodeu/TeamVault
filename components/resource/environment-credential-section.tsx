"use client"

import { Globe2, KeyRound, Plus, ShieldCheck } from "lucide-react"
import { useState } from "react"

import { CredentialCard } from "@/components/credential/credential-card"
import { CredentialForm } from "@/components/credential/credential-form"
import { SmartLinkForm } from "@/components/resource/smart-link-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Credential, ResourceLink } from "@/lib/db/schema"

export function EnvironmentCredentialSection({
  resourceId,
  links,
  credentials,
  subjects,
  accessGrants,
  mayEdit,
}: {
  resourceId: string
  links: ResourceLink[]
  credentials: Credential[]
  subjects: { id: string; label: string; type: "USER" | "GROUP" }[]
  accessGrants: { credentialId: string; subjectType: string; subjectId: string }[]
  mayEdit: boolean
}) {
  const [openNewLink, setOpenNewLink] = useState(false)
  const [openNewCred, setOpenNewCred] = useState(false)

  // Group credentials by linkId
  const globalCredentials = credentials.filter(c => !c.linkId)
  const linkedCredentials = links.map(link => ({
    ...link,
    credentials: credentials.filter(c => c.linkId === link.id),
  }))

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 border-b pb-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">环境拓扑与关联账号</h3>
        </div>
        {mayEdit ? (
          <div className="flex items-center gap-2">
            <Dialog open={openNewLink} onOpenChange={setOpenNewLink}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-medium">
                  <Globe2 className="size-3.5" />
                  添加环境 / 链接
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>新建环境链接</DialogTitle>
                  <DialogDescription>
                    创建一个独立的环境分站，随后您可为其分配专属密码。
                  </DialogDescription>
                </DialogHeader>
                <SmartLinkForm
                  resourceId={resourceId}
                  subjects={subjects}
                  onSuccess={() => setOpenNewLink(false)}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={openNewCred} onOpenChange={setOpenNewCred}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
                  <Plus className="size-3.5" />
                  添加账号
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>新建账号凭据</DialogTitle>
                  <DialogDescription>
                    添加一个用于访问该模块的账号密码，可单独绑定到指定环境。
                  </DialogDescription>
                </DialogHeader>
                <CredentialForm
                  resourceId={resourceId}
                  links={links}
                  subjects={subjects}
                  onDone={() => setOpenNewCred(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {/* Global Credentials */}
        {globalCredentials.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">全局通用账号</h4>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {globalCredentials.map(credential => {
                const grants = accessGrants.filter(g => g.credentialId === credential.id)
                return (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    mayEdit={mayEdit}
                    subjects={subjects}
                    accessGrants={grants as any}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Links and their Credentials */}
        {linkedCredentials.map(env => (
          <div key={env.id} className="rounded-xl border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-background shadow-xs border">
                  <Globe2 className="size-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    {env.title}
                    {env.accessMode === "RESTRICTED" && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="size-3" />
                        受限访问
                      </span>
                    )}
                  </h4>
                  <a href={env.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">
                    {env.url}
                  </a>
                </div>
              </div>
              {mayEdit && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      编辑环境配置
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>编辑环境配置</DialogTitle>
                    </DialogHeader>
                    <SmartLinkForm
                      resourceId={resourceId}
                      link={env}
                      subjects={subjects}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {env.credentials.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {env.credentials.map(credential => {
                  const grants = accessGrants.filter(g => g.credentialId === credential.id)
                  return (
                    <CredentialCard
                      key={credential.id}
                      credential={credential}
                      mayEdit={mayEdit}
                      subjects={subjects}
                      accessGrants={grants as any}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                暂无专门绑定于此环境的账号
              </div>
            )}
          </div>
        ))}

        {links.length === 0 && credentials.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <div className="flex justify-center mb-3 opacity-50">
              <KeyRound className="size-8" />
            </div>
            <p className="font-medium text-foreground">暂无环境链接或账号凭据</p>
            <p className="text-xs mt-1">您可以添加一个开发环境地址，并为其录入专属的数据库密码和后台账号。</p>
          </div>
        )}
      </div>
    </section>
  )
}
