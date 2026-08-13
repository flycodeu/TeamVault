"use client"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
export type CredentialSubjectGrant = { subjectType: "USER" | "GROUP"; subjectId: string }

export function CredentialSubjectPicker({ subjects, value, onChange }: { subjects: Subject[]; value: CredentialSubjectGrant[]; onChange: (value: CredentialSubjectGrant[]) => void }) {
  function toggle(subject: Subject) {
    const exists = value.some(item => item.subjectType === subject.type && item.subjectId === subject.id)
    onChange(exists ? value.filter(item => !(item.subjectType === subject.type && item.subjectId === subject.id)) : [...value, { subjectType: subject.type, subjectId: subject.id }])
  }

  return (
    <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
      {subjects.map(subject => {
        const checked = value.some(item => item.subjectType === subject.type && item.subjectId === subject.id)
        return <label key={`${subject.type}-${subject.id}`} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"><input type="checkbox" checked={checked} onChange={() => toggle(subject)} /><span className="min-w-0 flex-1 truncate">{subject.label}</span><span className="text-[10px] text-muted-foreground">{subject.type === "GROUP" ? "小组" : "成员"}</span></label>
      })}
      {!subjects.length ? <p className="px-2 py-3 text-center text-xs text-muted-foreground">暂无可选成员或小组</p> : null}
    </div>
  )
}
