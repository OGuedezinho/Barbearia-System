"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PREFERENCIA =
  "barber-system-manter-conectado";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [senha, setSenha] =
    useState("");

  const [manterConectado, setManterConectado] =
    useState(true);

  const [mensagem, setMensagem] =
    useState("");

  const [carregando, setCarregando] =
    useState(false);

  /*
   * ==========================
   * CARREGAR PREFERÊNCIA
   * ==========================
   */

  useEffect(() => {
    const cookies =
      document.cookie.split(";");

    const cookie =
      cookies.find((item) =>
        item
          .trim()
          .startsWith(
            `${PREFERENCIA}=`
          )
      );

    if (cookie) {
      const valor =
        cookie
          .split("=")
          .slice(1)
          .join("=")
          .trim();

      setManterConectado(
        valor === "true"
      );
    }
  }, []);

  /*
   * ==========================
   * SALVAR PREFERÊNCIA
   * ==========================
   */

  function salvarPreferencia(
    valor: boolean
  ) {
    /*
     * Se marcado:
     *
     * max-age de 30 dias.
     *
     * O navegador mantém a preferência
     * mesmo depois de ser fechado.
     */

    if (valor) {
      document.cookie =
        `${PREFERENCIA}=true; ` +
        "path=/; " +
        "max-age=2592000; " +
        "samesite=lax";
    } else {
      /*
       * Sem max-age:
       *
       * cookie de sessão.
       *
       * Ele desaparece quando o navegador
       * for encerrado.
       */

      document.cookie =
        `${PREFERENCIA}=false; ` +
        "path=/; " +
        "samesite=lax";
    }
  }

  /*
   * ==========================
   * LOGIN
   * ==========================
   */

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensagem("");

    if (!email || !senha) {
      setMensagem(
        "Preencha o e-mail e a senha."
      );

      return;
    }

    setCarregando(true);

    /*
     * Salva a escolha ANTES de autenticar.
     *
     * Nunca armazenamos a senha.
     */

    salvarPreferencia(
      manterConectado
    );

    const supabase =
      createClient();

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password: senha,
        }
      );

    setCarregando(false);

    if (error) {
      setMensagem(
        "E-mail ou senha incorretos."
      );

      return;
    }

    /*
     * Limpa a senha da memória do formulário
     * depois de um login bem-sucedido.
     */

    setSenha("");

    const pendencia = localStorage.getItem(
      "barber-system-criar-barbearia"
    );

    if (pendencia) {
      router.push("/criar-barbearia");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="
      min-h-screen
      bg-zinc-950
      text-white
      flex
      items-center
      justify-center
      px-4
    ">

      <section className="
        w-full
        max-w-md
        bg-zinc-900
        border
        border-zinc-800
        rounded-2xl
        p-8
        shadow-2xl
      ">

        {/* ========================== */}
        {/* CABEÇALHO */}
        {/* ========================== */}

        <div className="
          text-center
          mb-8
        ">

          <h1 className="
            text-3xl
            font-bold
          ">
            Barber System
          </h1>

          <p className="
            text-zinc-400
            mt-2
          ">
            Entre na sua conta
          </p>

        </div>

        {/* ========================== */}
        {/* FORMULÁRIO */}
        {/* ========================== */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* E-MAIL */}

          <div>

            <label className="
              block
              text-sm
              font-medium
              mb-2
            ">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="seuemail@email.com"
              autoComplete="email"
              className="
                w-full
                bg-zinc-800
                border
                border-zinc-700
                rounded-lg
                px-4
                py-3
                outline-none
                focus:border-white
                transition
              "
            />

          </div>

          {/* SENHA */}

          <div>

            <label className="
              block
              text-sm
              font-medium
              mb-2
            ">
              Senha
            </label>

            <input
              type="password"
              value={senha}
              onChange={(e) =>
                setSenha(
                  e.target.value
                )
              }
              placeholder="Digite sua senha"
              autoComplete="current-password"
              className="
                w-full
                bg-zinc-800
                border
                border-zinc-700
                rounded-lg
                px-4
                py-3
                outline-none
                focus:border-white
                transition
              "
            />

          </div>

          {/* ========================== */}
          {/* MANTER CONECTADO */}
          {/* ========================== */}

          <label className="
            flex
            items-center
            gap-3
            cursor-pointer
            select-none
            group
          ">

            <input
              type="checkbox"
              checked={manterConectado}
              onChange={(e) => {
                const valor =
                  e.target.checked;

                setManterConectado(
                  valor
                );

                salvarPreferencia(
                  valor
                );
              }}
              className="
                w-4
                h-4
                accent-white
                cursor-pointer
              "
            />

            <span className="
              text-sm
              text-zinc-400
              group-hover:text-zinc-200
              transition
            ">
              Manter minha conta conectada
            </span>

          </label>

          {/* ========================== */}
          {/* MENSAGEM */}
          {/* ========================== */}

          {mensagem && (
            <div className="
              bg-red-950/40
              border
              border-red-900
              rounded-lg
              p-3
              text-sm
              text-center
              text-red-300
            ">
              {mensagem}
            </div>
          )}

          {/* ========================== */}
          {/* BOTÃO */}
          {/* ========================== */}

          <button
            type="submit"
            disabled={carregando}
            className="
              w-full
              bg-white
              text-black
              font-semibold
              py-3
              rounded-lg
              hover:bg-zinc-200
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {carregando
              ? "Entrando..."
              : "Entrar"}
          </button>

        </form>

        {/* ========================== */}
        {/* CADASTRO */}
        {/* ========================== */}

        <div className="
          text-center
          mt-6
        ">

          <p className="
            text-sm
            text-zinc-400
          ">
            Ainda não possui uma conta?
          </p>

          <a
            href="/cadastro"
            className="
              text-white
              font-semibold
              mt-2
              inline-block
              hover:underline
            "
          >
            Criar conta
          </a>

        </div>

      </section>

    </main>
  );
}