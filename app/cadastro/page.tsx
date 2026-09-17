"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PENDENCIA_BARBEARIA = "barber-system-criar-barbearia";

export default function Cadastro() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [criarBarbearia, setCriarBarbearia] = useState(true);

  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    if (!nome.trim() || !email.trim() || !senha || !confirmarSenha) {
      setMensagem("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    if (criarBarbearia) {
      localStorage.setItem(
        PENDENCIA_BARBEARIA,
        JSON.stringify({
          nomeUsuario: nome.trim(),
          email: email.trim(),
        })
      );
    } else {
      localStorage.removeItem(PENDENCIA_BARBEARIA);
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
        },
      },
    });

    setCarregando(false);

    if (error) {
      localStorage.removeItem(PENDENCIA_BARBEARIA);
      setMensagem(error.message);
      return;
    }

    if (data.session) {
      if (criarBarbearia) {
        router.push("/criar-barbearia");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    setMensagem(
      criarBarbearia
        ? "Conta criada! Confirme seu e-mail e depois entre na conta. Ao entrar, você será levado para configurar sua barbearia."
        : "Conta criada! Verifique seu e-mail para confirmar a conta."
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Criar conta</h1>
          <p className="text-zinc-400 mt-2">
            Crie sua conta no Barber System.
          </p>
        </div>

        <form onSubmit={handleCadastro} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome"
              autoComplete="name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@email.com"
              autoComplete="email"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Crie uma senha"
              autoComplete="new-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setCriarBarbearia((valor) => !valor)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              criarBarbearia
                ? "border-white bg-white/10"
                : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                  criarBarbearia
                    ? "bg-white border-white text-black"
                    : "border-zinc-600"
                }`}
              >
                {criarBarbearia ? "✓" : ""}
              </div>
              <div>
                <p className="font-semibold">Quero criar minha própria barbearia</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Você será o dono e poderá configurar e administrar todo o sistema.
                </p>
              </div>
            </div>
          </button>

          {mensagem && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-center text-zinc-200">
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-zinc-400">Já possui uma conta?</p>
          <a
            href="/"
            className="text-white font-semibold mt-2 inline-block hover:underline"
          >
            Voltar para o login
          </a>
        </div>
      </section>
    </main>
  );
}
