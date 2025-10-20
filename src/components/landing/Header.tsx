import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Produto", href: "#produto" },
  { label: "Dashboards", href: "#dashboards" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="rounded-full bg-[#E9FB36]/20 p-2 text-[#0F172A]">
              <span className="block rounded-full bg-[#E9FB36] px-2 py-1 text-xs font-bold uppercase tracking-wide text-neutral-900">
                Unifique
              </span>
            </span>
            <span>Unifique</span>
          </div>
          <Badge className="hidden sm:inline-flex bg-[#E9FB36] text-neutral-900">
            SaaS B2B
          </Badge>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-200 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-[#E9FB36]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <a href="/auth">Entrar</a>
          </Button>
          <Button className="bg-[#E9FB36] text-neutral-900 hover:bg-[#d3eb0f]" asChild>
            <a href="#lead-capture">Criar conta</a>
          </Button>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-200 transition hover:bg-white/10 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-neutral-950/95 md:hidden">
          <div className="container flex flex-col gap-4 py-4 text-sm text-neutral-100">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#E9FB36]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <Button variant="outline" className="border-white/20 text-neutral-100" asChild>
                <a href="/auth">Entrar</a>
              </Button>
              <Button className="bg-[#E9FB36] text-neutral-900 hover:bg-[#d3eb0f]" asChild>
                <a href="#lead-capture">Criar conta</a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
