"use client"

import { Menu, X } from "lucide-react"
import { useState } from "react"

import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="打开导航">
        <Menu />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-label="关闭导航遮罩" />
          <div className="relative h-full w-[min(84vw,300px)] bg-card shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10"
              onClick={() => setOpen(false)}
              aria-label="关闭导航"
            >
              <X />
            </Button>
            <Sidebar mobile isAdmin={isAdmin} />
          </div>
        </div>
      ) : null}
    </>
  )
}
