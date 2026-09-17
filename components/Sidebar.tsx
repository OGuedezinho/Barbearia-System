"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const grupos = [
  {
    titulo: "Principal",
    itens: [
      ["Dashboard", "/dashboard", "⌂"],
      ["Agenda", "/dashboard/agenda", "▣"],
      ["Clientes", "/dashboard/clientes", "♙"],
      ["Serviços", "/dashboard/servicos", "✂"],
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      ["Profissionais", "/dashboard/profissionais", "♟"],
      ["Financeiro", "/dashboard/financeiro", "R$"],
      ["Planos", "/dashboard/planos", "▤"],
    ],
  },
  {
    titulo: "Sistema",
    itens: [["Configurações", "/dashboard/configuracoes", "⚙"]],
  },
] as const;

type Barb = { id: string; nome: string | null; logo_url?: string | null; cor_primaria?: string | null };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [barbearia, setBarbearia] = useState<Barb | null>(null);
  const [cargo, setCargo] = useState("Usuário");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ativo) return;
      setEmail(user.email ?? "");
      const { data: dono } = await supabase.from("barbearias").select("id,nome,logo_url,cor_primaria").eq("owner_id", user.id).maybeSingle();
      if (dono) { setBarbearia(dono); setCargo("Administrador"); return; }
      const { data: membro } = await supabase.from("membros_barbearia").select("barbearia_id,cargo,ativo").eq("user_id", user.id).eq("ativo", true).maybeSingle();
      if (!membro) return;
      const { data: barb } = await supabase.from("barbearias").select("id,nome,logo_url,cor_primaria").eq("id", membro.barbearia_id).maybeSingle();
      if (barb && ativo) { setBarbearia(barb); setCargo(membro.cargo || "Barbeiro"); }
    }
    carregar();
    return () => { ativo = false; };
  }, []);

  async function sair() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-white shadow-xl">☰</button>
      {aberto && <button aria-label="Fechar menu" onClick={() => setAberto(false)} className="lg:hidden fixed inset-0 z-40 bg-black/60" />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 ${aberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-zinc-800">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center font-bold">{barbearia?.logo_url ? <img src={barbearia.logo_url} alt="Logo" className="w-full h-full object-cover" /> : "✂"}</div>
            <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-zinc-600">Barber System</p><p className="font-semibold truncate">{barbearia?.nome || "Barbearia"}</p><p className="text-xs text-zinc-500 truncate">{cargo}</p></div>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 space-y-5">
            {grupos.map((grupo) => <div key={grupo.titulo}><p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-zinc-600">{grupo.titulo}</p><div className="space-y-1">{grupo.itens.map(([nome, caminho, icone]) => { const ativo = pathname === caminho || (caminho !== "/dashboard" && pathname.startsWith(caminho + "/")); return <Link key={caminho} href={caminho} onClick={() => setAberto(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${ativo ? "bg-white text-black font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}><span className="w-6 text-center">{icone}</span>{nome}</Link>; })}</div></div>)}
          </nav>
          <div className="border-t border-zinc-800 pt-3">
            <div className="px-3 py-2 mb-2"><p className="text-xs font-medium truncate">{email || "Conta"}</p><p className="text-[11px] text-zinc-600">{cargo}</p></div>
            <button onClick={sair} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-950/30 transition">↪ Sair</button>
          </div>
        </div>
      </aside>
    </>
  );
}
