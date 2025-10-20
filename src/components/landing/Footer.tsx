export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950 py-10 text-sm text-neutral-400">
      <div className="container flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Unifique. Todos os direitos reservados.</p>
        <div className="flex items-center justify-center gap-6 text-neutral-300">
          <a href="#" className="transition-colors hover:text-[#E9FB36]">
            Termos
          </a>
          <a href="#" className="transition-colors hover:text-[#E9FB36]">
            Privacidade
          </a>
          <a href="#" className="transition-colors hover:text-[#E9FB36]">
            Contato
          </a>
        </div>
      </div>
    </footer>
  );
}
