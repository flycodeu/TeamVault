import { redirect } from "next/navigation"

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/resources/${id}`)
}
