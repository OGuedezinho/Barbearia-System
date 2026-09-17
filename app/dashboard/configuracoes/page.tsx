"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Horario = {
  aberto: boolean;
  abertura: string;
  fechamento: string;
};

type Horarios = {
  segunda: Horario;
  terca: Horario;
  quarta: Horario;
  quinta: Horario;
  sexta: Horario;
  sabado: Horario;
  domingo: Horario;
};

const horariosPadrao: Horarios = {
  segunda: {
    aberto: true,
    abertura: "08:00",
    fechamento: "18:00",
  },
  terca: {
    aberto: true,
    abertura: "08:00",
    fechamento: "18:00",
  },
  quarta: {
    aberto: true,
    abertura: "08:00",
    fechamento: "18:00",
  },
  quinta: {
    aberto: true,
    abertura: "08:00",
    fechamento: "18:00",
  },
  sexta: {
    aberto: true,
    abertura: "08:00",
    fechamento: "18:00",
  },
  sabado: {
    aberto: true,
    abertura: "08:00",
    fechamento: "14:00",
  },
  domingo: {
    aberto: false,
    abertura: "08:00",
    fechamento: "14:00",
  },
};

const mensagemConfirmacaoPadrao = `Olá, {cliente}! 👋

Aqui é da {barbearia}.

Passando para confirmar seu horário no dia {data} às {horario}.

Seu atendimento será com {profissional}. 💈

Podemos contar com sua presença?`;

const dias: {
  chave: keyof Horarios;
  nome: string;
}[] = [
  {
    chave: "segunda",
    nome: "Segunda-feira",
  },
  {
    chave: "terca",
    nome: "Terça-feira",
  },
  {
    chave: "quarta",
    nome: "Quarta-feira",
  },
  {
    chave: "quinta",
    nome: "Quinta-feira",
  },
  {
    chave: "sexta",
    nome: "Sexta-feira",
  },
  {
    chave: "sabado",
    nome: "Sábado",
  },
  {
    chave: "domingo",
    nome: "Domingo",
  },
];

export default function Configuracoes() {
  const router = useRouter();

  const [barbeariaId, setBarbeariaId] =
    useState("");

  const [tipoUsuario, setTipoUsuario] =
    useState<"dono" | "membro" | null>(null);

  const [cargo, setCargo] =
    useState<string | null>(null);

  const [nome, setNome] =
    useState("");

  const [telefone, setTelefone] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [endereco, setEndereco] =
    useState("");

  const [cidade, setCidade] =
    useState("");

  const [estado, setEstado] =
    useState("");

  const [cep, setCep] =
    useState("");

  const [descricao, setDescricao] =
    useState("");

  const [logoUrl, setLogoUrl] =
    useState("");

  const [corPrimaria, setCorPrimaria] =
    useState("#ffffff");

  const [corSecundaria, setCorSecundaria] =
    useState("#18181b");

  const [horarios, setHorarios] =
    useState<Horarios>(horariosPadrao);

  const [mensagemConfirmacao, setMensagemConfirmacao] =
    useState(mensagemConfirmacaoPadrao);

  const [nomeUsuario, setNomeUsuario] =
    useState("");

  const [novaSenha, setNovaSenha] =
    useState("");

  const [confirmarSenha, setConfirmarSenha] =
    useState("");

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [salvandoConta, setSalvandoConta] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  const podeEditarBarbearia =
    tipoUsuario === "dono";

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setNomeUsuario(
        user.user_metadata?.nome ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          ""
      );

      const {
        barbearia,
        error: erroBarbearia,
        tipoUsuario: tipoUsuarioAtual,
        cargo: cargoAtual,
      } = await getBarbeariaDoUsuario();

      if (
        erroBarbearia ||
        !barbearia
      ) {
        console.error(
          "ERRO AO BUSCAR BARBEARIA:",
          erroBarbearia
        );

        setErro(
          "Não foi possível encontrar sua barbearia."
        );

        return;
      }

      setBarbeariaId(
        barbearia.id
      );

      setTipoUsuario(
        tipoUsuarioAtual
      );

      setCargo(
        cargoAtual
      );

      setNome(
        barbearia.nome || ""
      );

      setTelefone(
        barbearia.telefone || ""
      );

      setWhatsapp(
        barbearia.whatsapp || ""
      );

      setEndereco(
        barbearia.endereco || ""
      );

      setCidade(
        barbearia.cidade || ""
      );

      setEstado(
        barbearia.estado || ""
      );

      setCep(
        barbearia.cep || ""
      );

      setDescricao(
        barbearia.descricao || ""
      );

      setLogoUrl(
        barbearia.logo_url || ""
      );

      setCorPrimaria(
        barbearia.cor_primaria ||
          "#ffffff"
      );

      setCorSecundaria(
        barbearia.cor_secundaria ||
          "#18181b"
      );

      setMensagemConfirmacao(
        barbearia.mensagem_confirmacao ||
          mensagemConfirmacaoPadrao
      );

      if (
        barbearia.horarios_funcionamento
      ) {
        setHorarios({
          ...horariosPadrao,
          ...barbearia.horarios_funcionamento,
        });
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Erro ao carregar as configurações."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function salvarConfiguracoes(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!podeEditarBarbearia) {
      setErro(
        "Somente o dono pode alterar as configurações da barbearia."
      );

      return;
    }

    if (!barbeariaId) {
      setErro(
        "Barbearia não encontrada."
      );

      return;
    }

    setSalvando(true);
    setMensagem("");
    setErro("");

    if (!nome.trim()) {
      setErro(
        "O nome da barbearia é obrigatório."
      );

      setSalvando(false);
      return;
    }

    if (
      !mensagemConfirmacao.trim()
    ) {
      setErro(
        "A mensagem de confirmação não pode ficar vazia."
      );

      setSalvando(false);
      return;
    }

    const supabase = createClient();

    const { error } =
      await supabase
        .from("barbearias")
        .update({
          nome: nome.trim(),

          telefone:
            telefone.trim() || null,

          whatsapp:
            whatsapp.trim() || null,

          endereco:
            endereco.trim() || null,

          cidade:
            cidade.trim() || null,

          estado:
            estado.trim() || null,

          cep:
            cep.trim() || null,

          descricao:
            descricao.trim() || null,

          logo_url:
            logoUrl.trim() || null,

          cor_primaria:
            corPrimaria,

          cor_secundaria:
            corSecundaria,

          horarios_funcionamento:
            horarios,

          mensagem_confirmacao:
            mensagemConfirmacao.trim(),
        })
        .eq(
          "id",
          barbeariaId
        );

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar as configurações."
      );

      setSalvando(false);
      return;
    }

    setMensagem(
      "Configurações salvas com sucesso! ✅"
    );

    setSalvando(false);
  }

  async function salvarConta(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMensagem("");
    setErro("");

    if (
      novaSenha &&
      novaSenha.length < 6
    ) {
      setErro(
        "A nova senha precisa ter pelo menos 6 caracteres."
      );

      return;
    }

    if (
      novaSenha &&
      novaSenha !== confirmarSenha
    ) {
      setErro(
        "As senhas não são iguais."
      );

      return;
    }

    setSalvandoConta(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { error } =
      await supabase.auth.updateUser({
        data: {
          nome:
            nomeUsuario.trim(),
        },

        ...(novaSenha
          ? {
              password: novaSenha,
            }
          : {}),
      });

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível atualizar sua conta."
      );

      setSalvandoConta(false);
      return;
    }

    setNovaSenha("");
    setConfirmarSenha("");

    setMensagem(
      "Conta atualizada com sucesso! ✅"
    );

    setSalvandoConta(false);
  }

  function atualizarHorario(
    dia: keyof Horarios,
    campo: keyof Horario,
    valor: string | boolean
  ) {
    if (!podeEditarBarbearia) {
      return;
    }

    setHorarios(
      (atual) => ({
        ...atual,

        [dia]: {
          ...atual[dia],
          [campo]: valor,
        },
      })
    );
  }

  function inserirVariavel(
    variavel: string
  ) {
    if (!podeEditarBarbearia) {
      return;
    }

    setMensagemConfirmacao(
      (atual) =>
        `${atual}${atual.endsWith(" ") || atual.endsWith("\n") ? "" : " "}${variavel}`
    );
  }

  const mensagemPreview =
    mensagemConfirmacao
      .replaceAll(
        "{cliente}",
        "João"
      )
      .replaceAll(
        "{barbearia}",
        nome || "Barbearia"
      )
      .replaceAll(
        "{data}",
        "16/09/2026"
      )
      .replaceAll(
        "{horario}",
        "14:30"
      )
      .replaceAll(
        "{profissional}",
        "Nossa equipe"
      )
      .replaceAll(
        "{servicos}",
        "Corte + Barba"
      )
      .replaceAll(
        "{valor}",
        "R$ 50,00"
      );

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />

          <p className="text-zinc-500">
            Carregando configurações...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <div className="min-h-screen lg:pl-72">

        {/* HEADER */}

        <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">

            <div className="pl-14 lg:pl-0">

              <p className="text-xs text-zinc-600 uppercase tracking-wider">
                Sistema
              </p>

              <h1 className="text-xl sm:text-2xl font-bold mt-1">
                Configurações
              </h1>

            </div>

          </div>

        </header>

        {/* CONTEÚDO */}

        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

          <div className="mb-8">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  Configurações da barbearia
                </h2>

                <p className="text-zinc-500 mt-2">
                  Personalize os dados, identidade visual e horários do seu negócio.
                </p>

              </div>

              {tipoUsuario ===
                "membro" && (
                <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
                  <span>
                    {cargo ||
                      "Membro"}
                  </span>

                  <span className="text-zinc-700">
                    •
                  </span>

                  <span>
                    Somente visualização
                  </span>
                </div>
              )}

            </div>

          </div>

          {mensagem && (
            <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400">
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {erro}
            </div>
          )}

          <form
            onSubmit={
              salvarConfiguracoes
            }
            className="space-y-6"
          >

            {/* DADOS */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">

              <div className="border-b border-zinc-800 px-5 sm:px-6 py-5">

                <h3 className="font-semibold">
                  Dados da barbearia
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  Informações básicas do negócio.
                </p>

              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Nome
                  </label>

                  <input
                    value={nome}
                    onChange={(e) =>
                      setNome(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="Nome da barbearia"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Telefone
                  </label>

                  <input
                    value={telefone}
                    onChange={(e) =>
                      setTelefone(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    WhatsApp da barbearia
                  </label>

                  <input
                    value={whatsapp}
                    onChange={(e) =>
                      setWhatsapp(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="(00) 00000-0000"
                  />

                  <p className="text-xs text-zinc-600 mt-2">
                    Número que será usado futuramente para integrações automáticas.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    CEP
                  </label>

                  <input
                    value={cep}
                    onChange={(e) =>
                      setCep(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Endereço
                  </label>

                  <input
                    value={endereco}
                    onChange={(e) =>
                      setEndereco(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="Rua, número, bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Cidade
                  </label>

                  <input
                    value={cidade}
                    onChange={(e) =>
                      setCidade(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Estado
                  </label>

                  <input
                    value={estado}
                    onChange={(e) =>
                      setEstado(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    maxLength={2}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 uppercase outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="PR"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Descrição
                  </label>

                  <textarea
                    value={descricao}
                    onChange={(e) =>
                      setDescricao(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    rows={4}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none resize-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="Descrição da barbearia..."
                  />
                </div>

              </div>

            </section>

            {/* WHATSAPP */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">

              <div className="border-b border-zinc-800 px-5 sm:px-6 py-5">

                <h3 className="font-semibold">
                  💬 Confirmação de presença
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  Configure a mensagem que será aberta no WhatsApp do cliente.
                </p>

              </div>

              <div className="p-5 sm:p-6">

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div>

                    <label className="block text-sm text-zinc-400 mb-2">
                      Mensagem
                    </label>

                    <textarea
                      value={
                        mensagemConfirmacao
                      }
                      onChange={(e) =>
                        setMensagemConfirmacao(
                          e.target.value
                        )
                      }
                      disabled={
                        !podeEditarBarbearia
                      }
                      rows={12}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none resize-none focus:border-zinc-600 disabled:opacity-50"
                      placeholder="Digite a mensagem..."
                    />

                    <div className="mt-4">

                      <p className="text-xs text-zinc-500 mb-3">
                        Variáveis disponíveis:
                      </p>

                      <div className="flex flex-wrap gap-2">

                        {[
                          "{cliente}",
                          "{barbearia}",
                          "{data}",
                          "{horario}",
                          "{profissional}",
                          "{servicos}",
                          "{valor}",
                        ].map(
                          (variavel) => (
                            <button
                              key={
                                variavel
                              }
                              type="button"
                              disabled={
                                !podeEditarBarbearia
                              }
                              onClick={() =>
                                inserirVariavel(
                                  variavel
                                )
                              }
                              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-40"
                            >
                              {variavel}
                            </button>
                          )
                        )}

                      </div>

                    </div>

                  </div>

                  <div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">

                      <div className="border-b border-zinc-800 px-4 py-3">

                        <p className="text-xs text-zinc-500 uppercase tracking-wider">
                          Pré-visualização
                        </p>

                      </div>

                      <div className="p-5">

                        <div className="rounded-2xl bg-green-950/20 border border-green-900/40 p-4">

                          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                            {mensagemPreview}
                          </p>

                        </div>

                      </div>

                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">

                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Ao clicar em{" "}
                        <span className="text-green-400">
                          Confirmar presença
                        </span>{" "}
                        na Agenda, o sistema abrirá o WhatsApp do cliente com esta mensagem já preenchida.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* HORÁRIOS */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">

              <div className="border-b border-zinc-800 px-5 sm:px-6 py-5">

                <h3 className="font-semibold">
                  Horários de funcionamento
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  Defina quando sua barbearia funciona.
                </p>

              </div>

              <div className="p-5 sm:p-6 space-y-3">

                {dias.map(
                  ({
                    chave,
                    nome: nomeDia,
                  }) => {

                    const horario =
                      horarios[
                        chave
                      ];

                    return (
                      <div
                        key={chave}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                      >

                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                          <div className="flex items-center justify-between lg:w-52">

                            <p className="font-medium">
                              {nomeDia}
                            </p>

                            <button
                              type="button"
                              disabled={
                                !podeEditarBarbearia
                              }
                              onClick={() =>
                                atualizarHorario(
                                  chave,
                                  "aberto",
                                  !horario.aberto
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs border ${
                                horario.aberto
                                  ? "border-emerald-900 bg-emerald-950/30 text-emerald-400"
                                  : "border-zinc-800 bg-zinc-900 text-zinc-500"
                              } disabled:opacity-40`}
                            >
                              {horario.aberto
                                ? "Aberto"
                                : "Fechado"}
                            </button>

                          </div>

                          {horario.aberto && (
                            <div className="flex items-center gap-3">

                              <div>

                                <label className="block text-[11px] text-zinc-600 mb-1">
                                  Abertura
                                </label>

                                <input
                                  type="time"
                                  value={
                                    horario.abertura
                                  }
                                  disabled={
                                    !podeEditarBarbearia
                                  }
                                  onChange={(e) =>
                                    atualizarHorario(
                                      chave,
                                      "abertura",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600 disabled:opacity-40"
                                />

                              </div>

                              <span className="text-zinc-700 mt-5">
                                até
                              </span>

                              <div>

                                <label className="block text-[11px] text-zinc-600 mb-1">
                                  Fechamento
                                </label>

                                <input
                                  type="time"
                                  value={
                                    horario.fechamento
                                  }
                                  disabled={
                                    !podeEditarBarbearia
                                  }
                                  onChange={(e) =>
                                    atualizarHorario(
                                      chave,
                                      "fechamento",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600 disabled:opacity-40"
                                />

                              </div>

                            </div>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* IDENTIDADE VISUAL */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">

              <div className="border-b border-zinc-800 px-5 sm:px-6 py-5">

                <h3 className="font-semibold">
                  Identidade visual
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  Personalize a aparência do sistema.
                </p>

              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                <div className="md:col-span-2">

                  <label className="block text-sm text-zinc-400 mb-2">
                    URL da logo
                  </label>

                  <input
                    value={logoUrl}
                    onChange={(e) =>
                      setLogoUrl(
                        e.target.value
                      )
                    }
                    disabled={
                      !podeEditarBarbearia
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="https://..."
                  />

                </div>

                <div>

                  <label className="block text-sm text-zinc-400 mb-2">
                    Cor primária
                  </label>

                  <div className="flex items-center gap-3">

                    <input
                      type="color"
                      value={
                        corPrimaria
                      }
                      disabled={
                        !podeEditarBarbearia
                      }
                      onChange={(e) =>
                        setCorPrimaria(
                          e.target.value
                        )
                      }
                      className="w-14 h-12 rounded-lg border border-zinc-800 bg-zinc-950 p-1 disabled:opacity-40"
                    />

                    <input
                      value={
                        corPrimaria
                      }
                      disabled={
                        !podeEditarBarbearia
                      }
                      onChange={(e) =>
                        setCorPrimaria(
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 uppercase outline-none focus:border-zinc-600 disabled:opacity-50"
                    />

                  </div>

                </div>

                <div>

                  <label className="block text-sm text-zinc-400 mb-2">
                    Cor secundária
                  </label>

                  <div className="flex items-center gap-3">

                    <input
                      type="color"
                      value={
                        corSecundaria
                      }
                      disabled={
                        !podeEditarBarbearia
                      }
                      onChange={(e) =>
                        setCorSecundaria(
                          e.target.value
                        )
                      }
                      className="w-14 h-12 rounded-lg border border-zinc-800 bg-zinc-950 p-1 disabled:opacity-40"
                    />

                    <input
                      value={
                        corSecundaria
                      }
                      disabled={
                        !podeEditarBarbearia
                      }
                      onChange={(e) =>
                        setCorSecundaria(
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 uppercase outline-none focus:border-zinc-600 disabled:opacity-50"
                    />

                  </div>

                </div>

              </div>

            </section>

            {/* SALVAR */}

            {podeEditarBarbearia && (
              <div className="flex justify-end">

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar configurações"}
                </button>

              </div>
            )}

          </form>

          {/* CONTA */}

          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">

            <div className="border-b border-zinc-800 px-5 sm:px-6 py-5">

              <h3 className="font-semibold">
                Minha conta
              </h3>

              <p className="text-sm text-zinc-500 mt-1">
                Atualize seus dados de acesso.
              </p>

            </div>

            <form
              onSubmit={salvarConta}
              className="p-5 sm:p-6 space-y-5"
            >

              <div>

                <label className="block text-sm text-zinc-400 mb-2">
                  Nome
                </label>

                <input
                  value={
                    nomeUsuario
                  }
                  onChange={(e) =>
                    setNomeUsuario(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600"
                  placeholder="Seu nome"
                />

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>

                  <label className="block text-sm text-zinc-400 mb-2">
                    Nova senha
                  </label>

                  <input
                    type="password"
                    value={
                      novaSenha
                    }
                    onChange={(e) =>
                      setNovaSenha(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600"
                    placeholder="Nova senha"
                  />

                </div>

                <div>

                  <label className="block text-sm text-zinc-400 mb-2">
                    Confirmar senha
                  </label>

                  <input
                    type="password"
                    value={
                      confirmarSenha
                    }
                    onChange={(e) =>
                      setConfirmarSenha(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-600"
                    placeholder="Digite novamente"
                  />

                </div>

              </div>

              <div className="flex justify-end">

                <button
                  type="submit"
                  disabled={
                    salvandoConta
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-100 px-6 py-3 text-sm font-semibold text-black hover:bg-white transition disabled:opacity-50"
                >
                  {salvandoConta
                    ? "Atualizando..."
                    : "Atualizar conta"}
                </button>

              </div>

            </form>

          </section>

        </section>

      </div>

    </main>
  );
}