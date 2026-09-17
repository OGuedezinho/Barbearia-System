"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Profissional = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cargo: string | null;
  foto_url: string | null;
  ativo: boolean;
  observacoes: string | null;
};

type Formulario = {
  nome: string;
  telefone: string;
  email: string;
  cargo: string;
  foto_url: string;
  ativo: boolean;
  observacoes: string;
};

const formularioInicial: Formulario = {
  nome: "",
  telefone: "",
  email: "",
  cargo: "Barbeiro",
  foto_url: "",
  ativo: true,
  observacoes: "",
};

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<
    Profissional[]
  >([]);

  const [barbeariaId, setBarbeariaId] =
    useState<string | null>(null);

  const [tipoUsuario, setTipoUsuario] =
    useState<"dono" | "membro" | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);

  const [profissionalSelecionado, setProfissionalSelecionado] =
    useState<Profissional | null>(null);

  const [busca, setBusca] = useState("");

  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    carregarProfissionais();
  }, []);

  async function carregarProfissionais() {
    setLoading(true);
    setErro("");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      setErro("Sua sessão não foi encontrada.");
      setLoading(false);
      return;
    }

    const {
      barbearia,
      error: erroBarbearia,
      tipoUsuario: tipoUsuarioAtual,
    } = await getBarbeariaDoUsuario();

    if (erroBarbearia || !barbearia) {
      console.error(
        "ERRO AO BUSCAR BARBEARIA:",
        erroBarbearia
      );

      setErro(
        "Não foi possível encontrar sua barbearia."
      );

      setLoading(false);
      return;
    }

    setBarbeariaId(barbearia.id);
    setTipoUsuario(tipoUsuarioAtual);

    const { data, error } = await supabase
      .from("profissionais")
      .select(
        "id, barbearia_id, nome, telefone, email, cargo, foto_url, ativo, observacoes"
      )
      .eq("barbearia_id", barbearia.id)
      .order("ativo", {
        ascending: false,
      })
      .order("nome", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível carregar os profissionais."
      );

      setLoading(false);
      return;
    }

    setProfissionais(data ?? []);
    setLoading(false);
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setProfissionalSelecionado(null);
  }

  function abrirNovo() {
    if (tipoUsuario !== "dono") return;

    limparFormulario();
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicao(
    profissional: Profissional
  ) {
    if (tipoUsuario !== "dono") return;

    setProfissionalSelecionado(profissional);

    setFormulario({
      nome: profissional.nome,
      telefone:
        profissional.telefone ?? "",
      email:
        profissional.email ?? "",
      cargo:
        profissional.cargo ??
        "Barbeiro",
      foto_url:
        profissional.foto_url ?? "",
      ativo: profissional.ativo,
      observacoes:
        profissional.observacoes ?? "",
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    limparFormulario();
  }

  function atualizarCampo(
    campo: keyof Formulario,
    valor: string | boolean
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function salvarProfissional(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (tipoUsuario !== "dono") {
      setErro(
        "Somente o administrador pode gerenciar profissionais."
      );
      return;
    }

    if (!barbeariaId) {
      setErro(
        "Barbearia não encontrada."
      );
      return;
    }

    const nome = formulario.nome.trim();

    if (!nome) {
      setErro(
        "Digite o nome do profissional."
      );
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    const dados = {
      barbearia_id: barbeariaId,
      nome,
      telefone:
        formulario.telefone.trim() ||
        null,
      email:
        formulario.email.trim() ||
        null,
      cargo:
        formulario.cargo.trim() ||
        "Barbeiro",
      foto_url:
        formulario.foto_url.trim() ||
        null,
      ativo: formulario.ativo,
      observacoes:
        formulario.observacoes.trim() ||
        null,
    };

    if (profissionalSelecionado) {
      const { error } = await supabase
        .from("profissionais")
        .update(dados)
        .eq(
          "id",
          profissionalSelecionado.id
        )
        .eq(
          "barbearia_id",
          barbeariaId
        );

      if (error) {
        console.error(error);

        setErro(
          "Não foi possível atualizar o profissional."
        );

        setSalvando(false);
        return;
      }

      setSucesso(
        "Profissional atualizado com sucesso."
      );
    } else {
      const { error } = await supabase
        .from("profissionais")
        .insert(dados);

      if (error) {
        console.error(error);

        setErro(
          "Não foi possível cadastrar o profissional."
        );

        setSalvando(false);
        return;
      }

      setSucesso(
        "Profissional cadastrado com sucesso."
      );
    }

    await carregarProfissionais();

    setSalvando(false);
    setModalAberto(false);
    limparFormulario();
  }

  async function alternarStatus(
    profissional: Profissional
  ) {
    if (tipoUsuario !== "dono") return;

    if (!barbeariaId) return;

    const novoStatus =
      !profissional.ativo;

    const { error } = await supabase
      .from("profissionais")
      .update({
        ativo: novoStatus,
      })
      .eq(
        "id",
        profissional.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível alterar o status."
      );

      return;
    }

    setProfissionais((lista) =>
      lista.map((item) =>
        item.id === profissional.id
          ? {
              ...item,
              ativo: novoStatus,
            }
          : item
      )
    );

    setSucesso(
      novoStatus
        ? `${profissional.nome} foi ativado.`
        : `${profissional.nome} foi desativado.`
    );
  }

  async function excluirProfissional(
    profissional: Profissional
  ) {
    if (tipoUsuario !== "dono") return;

    if (!barbeariaId) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir ${profissional.nome}?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmar) return;

    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq(
        "id",
        profissional.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível excluir este profissional. Ele pode estar vinculado a outros registros."
      );

      return;
    }

    setProfissionais((lista) =>
      lista.filter(
        (item) =>
          item.id !== profissional.id
      )
    );

    setSucesso(
      "Profissional excluído com sucesso."
    );
  }

  function abrirWhatsApp(
    telefone: string
  ) {
    const numero = telefone.replace(
      /\D/g,
      ""
    );

    if (!numero) {
      return;
    }

    const numeroFinal =
      numero.startsWith("55")
        ? numero
        : `55${numero}`;

    window.open(
      `https://wa.me/${numeroFinal}`,
      "_blank"
    );
  }

  const profissionaisFiltrados =
    useMemo(() => {
      const termo =
        busca.trim().toLowerCase();

      if (!termo) {
        return profissionais;
      }

      return profissionais.filter(
        (profissional) =>
          profissional.nome
            .toLowerCase()
            .includes(termo) ||
          (
            profissional.email ??
            ""
          )
            .toLowerCase()
            .includes(termo) ||
          (
            profissional.telefone ??
            ""
          )
            .toLowerCase()
            .includes(termo) ||
          (
            profissional.cargo ??
            ""
          )
            .toLowerCase()
            .includes(termo)
      );
    }, [profissionais, busca]);

  const ativos = profissionais.filter(
    (item) => item.ativo
  ).length;

  const inativos =
    profissionais.length - ativos;

  function iniciais(nome: string) {
    const partes = nome
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) {
      return "?";
    }

    if (partes.length === 1) {
      return partes[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      partes[0].charAt(0) +
      partes[partes.length - 1].charAt(0)
    ).toUpperCase();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* CABEÇALHO */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Gestão
              </span>

              <span className="text-zinc-700">
                /
              </span>

              <span className="text-xs text-zinc-500">
                Equipe
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Profissionais
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Cadastre e gerencie os profissionais
              que fazem parte da sua barbearia.
            </p>
          </div>

          {tipoUsuario === "dono" && (
            <button
              type="button"
              onClick={abrirNovo}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              + Novo profissional
            </button>
          )}
        </div>

        {/* ALERTAS */}

        {erro && !modalAberto && (
          <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        {sucesso && !modalAberto && (
          <div className="mb-5 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
            {sucesso}
          </div>
        )}

        {/* RESUMO */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Total da equipe
              </p>

              <span className="text-lg">
                👥
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold">
              {profissionais.length}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              profissionais cadastrados
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Ativos
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>

            <p className="mt-3 text-3xl font-bold text-emerald-400">
              {ativos}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              disponíveis para trabalhar
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Inativos
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            </div>

            <p className="mt-3 text-3xl font-bold text-zinc-400">
              {inativos}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              temporariamente indisponíveis
            </p>
          </div>
        </div>

        {/* LISTA */}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Equipe
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {profissionaisFiltrados.length} profissional
                  {profissionaisFiltrados.length !==
                  1
                    ? "is"
                    : ""}{" "}
                  encontrado
                  {profissionaisFiltrados.length !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  🔎
                </span>

                <input
                  type="text"
                  value={busca}
                  onChange={(e) =>
                    setBusca(e.target.value)
                  }
                  placeholder="Buscar por nome, cargo..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />

              <p className="text-sm text-zinc-500">
                Carregando profissionais...
              </p>
            </div>
          ) : profissionaisFiltrados.length === 0 ? (
            <div className="p-12 text-center sm:p-16">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-2xl">
                {busca ? "🔎" : "✂️"}
              </div>

              <h3 className="text-lg font-semibold">
                {busca
                  ? "Nenhum profissional encontrado"
                  : "Sua equipe está vazia"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                {busca
                  ? "Tente buscar por outro nome, cargo, telefone ou e-mail."
                  : "Cadastre o primeiro profissional para começar a organizar sua equipe."}
              </p>

              {busca ? (
                <button
                  type="button"
                  onClick={() =>
                    setBusca("")
                  }
                  className="mt-6 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Limpar busca
                </button>
              ) : tipoUsuario === "dono" ? (
                <button
                  type="button"
                  onClick={abrirNovo}
                  className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                  + Cadastrar profissional
                </button>
              ) : (
                <p className="mt-6 text-sm text-zinc-600">
                  Somente o administrador da barbearia pode cadastrar profissionais.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
              {profissionaisFiltrados.map(
                (profissional) => (
                  <article
                    key={profissional.id}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
                  >

                    {/* PERFIL */}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        {profissional.foto_url ? (
                          <img
                            src={
                              profissional.foto_url
                            }
                            alt={`Foto de ${profissional.nome}`}
                            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-zinc-800"
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-lg font-bold text-zinc-300">
                            {iniciais(
                              profissional.nome
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-zinc-100">
                            {profissional.nome}
                          </h3>

                          <p className="mt-1 truncate text-sm text-zinc-500">
                            {profissional.cargo ||
                              "Barbeiro"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                          profissional.ativo
                            ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />

                        {profissional.ativo
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>

                    {/* CONTATOS */}

                    <div className="my-5 h-px bg-zinc-800" />

                    <div className="min-h-[72px] space-y-3">
                      {profissional.telefone ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3 text-sm text-zinc-400">
                            <span className="text-base">
                              📞
                            </span>

                            <span className="truncate">
                              {
                                profissional.telefone
                              }
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              abrirWhatsApp(
                                profissional.telefone ??
                                  ""
                              )
                            }
                            className="shrink-0 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-2.5 py-1.5 text-[10px] font-medium text-emerald-400 transition hover:bg-emerald-950/40"
                          >
                            WhatsApp
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-sm text-zinc-600">
                          <span>
                            📞
                          </span>

                          <span>
                            Telefone não informado
                          </span>
                        </div>
                      )}

                      {profissional.email ? (
                        <div className="flex min-w-0 items-center gap-3 text-sm text-zinc-400">
                          <span>
                            ✉️
                          </span>

                          <span className="truncate">
                            {
                              profissional.email
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-sm text-zinc-600">
                          <span>
                            ✉️
                          </span>

                          <span>
                            E-mail não informado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* OBSERVAÇÃO */}

                    {profissional.observacoes && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
                          Observação
                        </p>

                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {
                            profissional.observacoes
                          }
                        </p>
                      </div>
                    )}

                    {/* AÇÕES */}

                    {tipoUsuario === "dono" && (
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            abrirEdicao(
                              profissional
                            )
                          }
                          className="rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alternarStatus(
                              profissional
                            )
                          }
                          className="rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
                        >
                          {profissional.ativo
                            ? "Desativar"
                            : "Ativar"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            excluirProfissional(
                              profissional
                            )
                          }
                          className="rounded-xl border border-red-900/50 px-3 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-950/30"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    )}

                    {/* AVISO MEMBRO */}

                    {tipoUsuario === "membro" && (
                      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-center">
                        <p className="text-[10px] text-zinc-600">
                          Visualização somente
                        </p>
                      </div>
                    )}

                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* NOTA */}

        {profissionais.length > 0 && (
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex gap-3">
              <span className="text-lg">
                💡
              </span>

              <div>
                <p className="text-sm font-medium text-zinc-300">
                  Próxima integração
                </p>

                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Depois podemos vincular cada profissional
                  aos agendamentos, permitindo escolher o
                  barbeiro responsável por cada atendimento
                  diretamente na Agenda.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}

      {modalAberto && tipoUsuario === "dono" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              fecharModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

            {/* HEADER MODAL */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Equipe
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {profissionalSelecionado
                    ? "Editar profissional"
                    : "Novo profissional"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Preencha os dados do profissional.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fecharModal
                }
                disabled={salvando}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                salvarProfissional
              }
              className="p-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* NOME */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Nome *
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.nome
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "nome",
                        e.target.value
                      )
                    }
                    placeholder="Ex.: João Silva"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

                {/* TELEFONE */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Telefone
                  </label>

                  <input
                    type="tel"
                    value={
                      formulario.telefone
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "telefone",
                        e.target.value
                      )
                    }
                    placeholder="(41) 99999-9999"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={
                      formulario.email
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "email",
                        e.target.value
                      )
                    }
                    placeholder="profissional@email.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

                {/* CARGO */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Cargo
                  </label>

                  <select
                    value={
                      formulario.cargo
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "cargo",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-zinc-600"
                  >
                    <option value="Barbeiro">
                      Barbeiro
                    </option>

                    <option value="Gerente">
                      Gerente
                    </option>

                    <option value="Administrador">
                      Administrador
                    </option>

                    <option value="Recepcionista">
                      Recepcionista
                    </option>

                    <option value="Outro">
                      Outro
                    </option>
                  </select>
                </div>

                {/* FOTO */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    URL da foto
                  </label>

                  <input
                    type="url"
                    value={
                      formulario.foto_url
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "foto_url",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

                {/* PREVIEW FOTO */}

                {formulario.foto_url && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <img
                        src={
                          formulario.foto_url
                        }
                        alt="Pré-visualização"
                        className="h-16 w-16 rounded-2xl object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />

                      <div>
                        <p className="text-sm font-medium">
                          Pré-visualização
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          A foto aparecerá no card do profissional.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATUS */}

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div>
                      <p className="text-sm font-medium">
                        Profissional ativo
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Mantenha ativo enquanto o profissional
                        estiver disponível na barbearia.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        atualizarCampo(
                          "ativo",
                          !formulario.ativo
                        )
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        formulario.ativo
                          ? "bg-emerald-500"
                          : "bg-zinc-700"
                      }`}
                      aria-label={
                        formulario.ativo
                          ? "Desativar profissional"
                          : "Ativar profissional"
                      }
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                          formulario.ativo
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* OBSERVAÇÕES */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Observações
                  </label>

                  <textarea
                    value={
                      formulario.observacoes
                    }
                    onChange={(e) =>
                      atualizarCampo(
                        "observacoes",
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Informações adicionais sobre o profissional..."
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* ERRO MODAL */}

              {erro && (
                <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
                  {erro}
                </div>
              )}

              {/* BOTÕES */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={salvando}
                  className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : profissionalSelecionado
                    ? "Salvar alterações"
                    : "Cadastrar profissional"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}