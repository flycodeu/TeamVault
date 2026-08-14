import { redirect } from "next/navigation"

export default function WebsitesPage() {
  redirect("/resources?kind=WEBSITE")
}
