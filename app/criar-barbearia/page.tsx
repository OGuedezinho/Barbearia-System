"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PENDENCIA_BARBEARIA = "barber-system-criar-barbearia";

export default function CriarBarbearia() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/");
        return;
      }

      const pendencia = localStorage.getItem(PENDENCIA_BARBEARIA);
      if (pendencia) {
        try {
          const dados = JSON.parse(pendencia) as { nomeUsuario?: string };
          if (dados.nomeUsuario && !nome) {
            // Não usamos o nome do usuário como nome da barbearia;
            // apenas mantemos a tela pronta para preenchimento.
          }
        } catch {
          localStorage.removeItem(PENDENCIA_BARBEARIA);
        }
      }

      const { data: existente } = await supabase
        .from("barbearias")
        .select("id")
        .eq("owner_id", data.user.id)
        .maybeSingle();

      if (existente) {
        localStorage.removeItem(PENDENCIA_BARBEARIA);
        router.replace("/dashboard");
        return;
      }

      setCarregando(false);
    }

    void carregar();
  }, [router, supabase]);

  async function criarBarbearia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    if (!nome.trim()) {
      setMensagem("Informe o nome da sua barbearia.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      setSalvando(false);
      setMensagem("Sua sessão expirou. Entre novamente.");
      return;
    }

    const { error } = await supabase.from("barbearias").insert({
      owner_id: user.id,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      endereco: endereco.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      cep: cep.trim() || null,
      descricao: descricao.trim() || null,
    });

    setSalvando(false);

    if (error) {
      console.error("Erro ao criar barbearia:", error);
      setMensagem(
        error.code === "23505"
          ? "Sua conta já possui uma barbearia."
          : `Não foi possível criar a barbearia: ${error.message}`
      );
      return;
    }

    localStorage.removeItem(PENDENCIA_BARBEARIA);
    router.replace("/dashboard");
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm text-zinc-400 mb-2">Barber System</p>
          <h1 className="text-3xl font-bold">Crie sua barbearia</h1>
          <p className="text-zinc-400 mt-2">
            Configure os dados básicos. Depois disso, sua conta será a dona da barbearia e terá acesso às funções de administração.
          </p>
        </div>

        <form onSubmit={criarBarbearia} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Nome da barbearia *</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Barbearia Guedes"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Telefone</label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Endereço</label>
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">Cidade</label>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Sua cidade"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <input
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="PR"
                maxLength={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">CEP</label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Uma breve descrição da sua barbearia"
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white resize-none"
            />
          </div>

          {mensagem && (
            <div className="bg-red-950/40 border border-red-900 rounded-lg p-3 text-sm text-red-300">
              {mensagem}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto px-5 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="w-full sm:flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? "Criando barbearia..." : "Criar minha barbearia"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
