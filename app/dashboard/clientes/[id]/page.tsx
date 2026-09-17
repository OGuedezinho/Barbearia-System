"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
};

type Agendamento = {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  servico_id: string;
};

type Servico = {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
};

export default function ClienteFichaPage() {
  const router = useRouter();
  const params = useParams();

  const clienteId = params.id as string;

  const [cliente, setCliente] =
    useState<Cliente | null>(null);

  const [agendamentos, setAgendamentos] =
    useState<Agendamento[]>([]);

  const [servicos, setServicos] =
    useState<Servico[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [nome, setNome] =
    useState("");

  const [telefone, setTelefone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [observacoes, setObservacoes] =
    useState("");

  const [salvando, setSalvando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  useEffect(() => {
    if (clienteId) {
      carregarCliente();
    }
  }, [clienteId]);

  async function carregarCliente() {
    setCarregando(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const {
      data: barbearia,
      error: barbeariaError,
    } = await supabase
      .from("barbearias")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (
      barbeariaError ||
      !barbearia
    ) {
      console.error(
        "ERRO AO BUSCAR BARBEARIA:",
        JSON.stringify(
          barbeariaError,
          null,
          2
        )
      );

      setCarregando(false);
      return;
    }

    const {
      data: clienteData,
      error: clienteError,
    } = await supabase
      .from("clientes")
      .select("*")
      .eq(
        "id",
        clienteId
      )
      .eq(
        "barbearia_id",
        barbearia.id
      )
      .single();

    if (
      clienteError ||
      !clienteData
    ) {
      console.error(
        "ERRO AO BUSCAR CLIENTE:",
        JSON.stringify(
          clienteError,
          null,
          2
        )
      );

      setCarregando(false);
      return;
    }

    setCliente(clienteData);

    setNome(
      clienteData.nome ?? ""
    );

    setTelefone(
      clienteData.telefone ?? ""
    );

    setEmail(
      clienteData.email ?? ""
    );

    setObservacoes(
      clienteData.observacoes ?? ""
    );

    const {
      data: agendamentosData,
      error: agendamentosError,
    } = await supabase
      .from("agendamentos")
      .select(
        "id, data_hora, status, observacoes, servico_id"
      )
      .eq(
        "cliente_id",
        clienteId
      )
      .eq(
        "barbearia_id",
        barbearia.id
      )
      .order(
        "data_hora",
        {
          ascending: false,
        }
      );

    if (agendamentosError) {
      console.error(
        "ERRO AO BUSCAR HISTÓRICO:",
        JSON.stringify(
          agendamentosError,
          null,
          2
        )
      );
    }

    const listaAgendamentos =
      agendamentosData ?? [];

    setAgendamentos(
      listaAgendamentos
    );

    if (
      listaAgendamentos.length > 0
    ) {
      const idsServicos = [
        ...new Set(
          listaAgendamentos.map(
            (item) =>
              item.servico_id
          )
        ),
      ];

      const {
        data: servicosData,
        error: servicosError,
      } = await supabase
        .from("servicos")
        .select(
          "id, nome, preco, duracao_minutos"
        )
        .in(
          "id",
          idsServicos
        );

      if (servicosError) {
        console.error(
          "ERRO AO BUSCAR SERVIÇOS:",
          JSON.stringify(
            servicosError,
            null,
            2
          )
        );
      }

      setServicos(
        servicosData ?? []
      );
    } else {
      setServicos([]);
    }

    setCarregando(false);
  }

  function abrirEdicao() {
    if (!cliente) {
      return;
    }

    setNome(
      cliente.nome
    );

    setTelefone(
      cliente.telefone ?? ""
    );

    setEmail(
      cliente.email ?? ""
    );

    setObservacoes(
      cliente.observacoes ?? ""
    );

    setMensagem("");

    setMostrarModal(true);
  }

  function fecharEdicao() {
    setMostrarModal(false);
    setMensagem("");
  }

  async function salvarCliente(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!cliente) {
      return;
    }

    if (!nome.trim()) {
      setMensagem(
        "Informe o nome do cliente."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    const supabase =
      createClient();

    const {
      data,
      error,
    } = await supabase
      .from("clientes")
      .update({
        nome: nome.trim(),
        telefone:
          telefone.trim() ||
          null,
        email:
          email.trim() ||
          null,
        observacoes:
          observacoes.trim() ||
          null,
      })
      .eq(
        "id",
        cliente.id
      )
      .eq(
        "barbearia_id",
        cliente.barbearia_id
      )
      .select("*")
      .single();

    if (error) {
      console.error(
        "ERRO AO ATUALIZAR CLIENTE:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível salvar as alterações."
      );

      setSalvando(false);
      return;
    }

    setCliente(data);

    setSalvando(false);

    fecharEdicao();
  }

  function obterServico(
    servicoId: string
  ) {
    return servicos.find(
      (servico) =>
        servico.id ===
        servicoId
    );
  }

  function obterIniciais(
    nomeCliente: string
  ) {
    const partes =
      nomeCliente
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      partes.length === 0
    ) {
      return "?";
    }

    if (
      partes.length === 1
    ) {
      return partes[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      partes[0][0] +
      partes[
        partes.length - 1
      ][0]
    ).toUpperCase();
  }

  function formatarData(
    dataHora: string
  ) {
    return new Date(
      dataHora
    ).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatarDataLonga(
    dataHora: string
  ) {
    return new Date(
      dataHora
    ).toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatarHora(
    dataHora: string
  ) {
    return new Date(
      dataHora
    ).toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatarPreco(
    valor: number
  ) {
    return Number(
      valor
    ).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function textoStatus(
    status: string
  ) {
    if (
      status ===
      "confirmado"
    ) {
      return "Confirmado";
    }

    if (
      status ===
      "concluido"
    ) {
      return "Concluído";
    }

    if (
      status ===
      "cancelado"
    ) {
      return "Cancelado";
    }

    return "Agendado";
  }

  function classeStatus(
    status: string
  ) {
    if (
      status ===
      "confirmado"
    ) {
      return "bg-blue-950/50 border-blue-900 text-blue-400";
    }

    if (
      status ===
      "concluido"
    ) {
      return "bg-green-950/50 border-green-900 text-green-400";
    }

    if (
      status ===
      "cancelado"
    ) {
      return "bg-red-950/50 border-red-900 text-red-400";
    }

    return "bg-zinc-800 border-zinc-700 text-zinc-400";
  }

  function abrirWhatsApp() {
    if (!cliente?.telefone) {
      alert(
        "Este cliente não possui telefone cadastrado."
      );
      return;
    }

    const numero =
      cliente.telefone.replace(
        /\D/g,
        ""
      );

    if (!numero) {
      alert(
        "O telefone cadastrado não é válido."
      );
      return;
    }

    const mensagemWhatsApp =
      `Olá, ${cliente.nome}! Tudo bem? Estou entrando em contato pela barbearia Guedes Localizada no centro de Cidade Gaúcha.`;

    const url =
      `https://wa.me/55${numero}?text=${encodeURIComponent(
        mensagemWhatsApp
      )}`;

    window.open(
      url,
      "_blank"
    );
  }

  function abrirAgenda() {
    router.push(
      "/dashboard/agenda"
    );
  }

  function abrirAgendamentoNaAgenda(
    agendamento: Agendamento
  ) {
    const data =
      new Date(
        agendamento.data_hora
      );

    const dataString =
      `${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}-${String(
        data.getDate()
      ).padStart(
        2,
        "0"
      )}`;

    const hora =
      `${String(
        data.getHours()
      ).padStart(
        2,
        "0"
      )}:${String(
        data.getMinutes()
      ).padStart(
        2,
        "0"
      )}`;

    router.push(
      `/dashboard/agenda?data=${dataString}&hora=${hora}&agendamento=${agendamento.id}`
    );
  }

  const atendimentosConcluidos =
    useMemo(() => {
      return agendamentos.filter(
        (agendamento) =>
          agendamento.status ===
          "concluido"
      );
    }, [agendamentos]);

  const totalGasto =
    useMemo(() => {
      return atendimentosConcluidos.reduce(
        (total, agendamento) => {
          const servico =
            obterServico(
              agendamento.servico_id
            );

          return (
            total +
            Number(
              servico?.preco ??
                0
            )
          );
        },
        0
      );
    }, [
      atendimentosConcluidos,
      servicos,
    ]);

  const ultimoAtendimento =
    useMemo(() => {
      return (
        atendimentosConcluidos[0] ??
        null
      );
    }, [
      atendimentosConcluidos,
    ]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-9 h-9 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto" />

          <p className="text-sm text-zinc-500 mt-4">
            Carregando ficha...
          </p>

        </div>

      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">

        <div className="text-center">

          <div className="text-4xl">
            👤
          </div>

          <h1 className="text-xl font-semibold mt-4">
            Cliente não encontrado
          </h1>

          <p className="text-sm text-zinc-500 mt-2">
            Não foi possível encontrar este cliente.
          </p>

          <button
            onClick={() =>
              router.push(
                "/dashboard/clientes"
              )
            }
            className="mt-6 bg-white text-black px-5 py-3 rounded-xl text-sm font-semibold"
          >
            Voltar para clientes
          </button>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* HEADER */}

      <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">

        <div className="px-4 md:px-6 py-5">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3 min-w-0">

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/clientes"
                  )
                }
                className="w-10 h-10 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
                title="Voltar"
              >
                ←
              </button>

              <div className="min-w-0">

                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Clientes
                </p>

                <h1 className="text-xl md:text-2xl font-bold truncate">
                  Ficha do cliente
                </h1>

              </div>

            </div>

            <button
              onClick={
                abrirAgenda
              }
              className="hidden sm:flex bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition"
            >
              + Agendar
            </button>

          </div>

        </div>

      </header>

      {/* CONTEÚDO */}

      <section className="p-4 md:p-6">

        <div className="max-w-6xl mx-auto space-y-5">

          {/* PERFIL */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div className="flex items-center gap-4 min-w-0">

                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg md:text-xl font-bold shrink-0">
                  {obterIniciais(
                    cliente.nome
                  )}
                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl md:text-2xl font-bold truncate">
                      {cliente.nome}
                    </h2>

                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />

                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2">

                    <p className="text-sm text-zinc-400">
                      📱{" "}
                      {cliente.telefone ||
                        "Sem telefone"}
                    </p>

                    <p className="text-sm text-zinc-500 truncate">
                      ✉{" "}
                      {cliente.email ||
                        "Sem e-mail"}
                    </p>

                  </div>

                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={
                    abrirEdicao
                  }
                  className="border border-zinc-700 px-4 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  ✏️ Editar
                </button>

                <button
                  onClick={
                    abrirWhatsApp
                  }
                  className="border border-zinc-700 px-4 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  💬 WhatsApp
                </button>

                <button
                  onClick={
                    abrirAgenda
                  }
                  className="sm:hidden bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold"
                >
                  + Agendar
                </button>

              </div>

            </div>

          </div>

          {/* RESUMO */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Atendimentos
              </p>

              <p className="text-2xl font-bold mt-2">
                {agendamentos.length}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                no histórico
              </p>

            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Concluídos
              </p>

              <p className="text-2xl font-bold mt-2 text-green-400">
                {
                  atendimentosConcluidos.length
                }
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                atendimentos realizados
              </p>

            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Total gasto
              </p>

              <p className="text-xl md:text-2xl font-bold mt-2">
                {formatarPreco(
                  totalGasto
                )}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                em serviços concluídos
              </p>

            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Último atendimento
              </p>

              <p className="text-xl md:text-2xl font-bold mt-2">
                {ultimoAtendimento
                  ? formatarData(
                      ultimoAtendimento.data_hora
                    )
                  : "—"}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                {ultimoAtendimento
                  ? formatarHora(
                      ultimoAtendimento.data_hora
                    )
                  : "Nenhum concluído"}
              </p>

            </div>

          </div>

          {/* GRID PRINCIPAL */}

          <div className="grid lg:grid-cols-[1fr_320px] gap-5">

            {/* HISTÓRICO */}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">

                <div>

                  <h3 className="font-semibold">
                    Histórico de atendimentos
                  </h3>

                  <p className="text-xs text-zinc-600 mt-1">
                    Todos os agendamentos deste cliente.
                  </p>

                </div>

                <span className="text-xs text-zinc-600">
                  {agendamentos.length}{" "}
                  registro
                  {agendamentos.length !==
                  1
                    ? "s"
                    : ""}
                </span>

              </div>

              {agendamentos.length ===
                0 ? (

                <div className="p-10 text-center">

                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-xl">
                    📅
                  </div>

                  <h4 className="font-semibold mt-4">
                    Nenhum atendimento ainda
                  </h4>

                  <p className="text-sm text-zinc-600 mt-2">
                    Este cliente ainda não possui atendimentos registrados.
                  </p>

                  <button
                    onClick={
                      abrirAgenda
                    }
                    className="mt-5 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    + Agendar atendimento
                  </button>

                </div>

              ) : (

                <div>

                  {agendamentos.map(
                    (
                      agendamento,
                      indice
                    ) => {

                      const servico =
                        obterServico(
                          agendamento.servico_id
                        );

                      return (
                        <div
                          key={
                            agendamento.id
                          }
                          className={`p-5 ${
                            indice !==
                            agendamentos.length -
                              1
                              ? "border-b border-zinc-800"
                              : ""
                          } hover:bg-zinc-800/30 transition`}
                        >

                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                            <div className="flex items-start gap-4">

                              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                ✂️
                              </div>

                              <div>

                                <p className="font-semibold text-sm">
                                  {servico?.nome ??
                                    "Serviço"}
                                </p>

                                <p className="text-xs text-zinc-500 mt-1 capitalize">
                                  {formatarDataLonga(
                                    agendamento.data_hora
                                  )}
                                </p>

                                <p className="text-xs text-zinc-600 mt-1">
                                  às{" "}
                                  {formatarHora(
                                    agendamento.data_hora
                                  )}
                                </p>

                              </div>

                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4">

                              <div className="text-right">

                                <p className="font-semibold text-sm">
                                  {formatarPreco(
                                    servico?.preco ??
                                      0
                                  )}
                                </p>

                                <span
                                  className={`inline-flex border px-2 py-1 rounded-full text-[10px] mt-1 ${classeStatus(
                                    agendamento.status
                                  )}`}
                                >
                                  {textoStatus(
                                    agendamento.status
                                  )}
                                </span>

                              </div>

                              <button
                                onClick={() =>
                                  abrirAgendamentoNaAgenda(
                                    agendamento
                                  )
                                }
                                className="w-9 h-9 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                                title="Abrir na agenda"
                              >
                                →
                              </button>

                            </div>

                          </div>

                          {agendamento.observacoes && (

                            <div className="mt-4 ml-0 md:ml-15 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">

                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                                Observação do atendimento
                              </p>

                              <p className="text-xs text-zinc-400 mt-1">
                                {
                                  agendamento.observacoes
                                }
                              </p>

                            </div>

                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

            {/* LATERAL */}

            <div className="space-y-5">

              {/* INFORMAÇÕES */}

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

                <h3 className="font-semibold">
                  Informações
                </h3>

                <div className="mt-4 space-y-4">

                  <div>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Nome
                    </p>

                    <p className="text-sm text-zinc-300 mt-1">
                      {cliente.nome}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Telefone
                    </p>

                    <p className="text-sm text-zinc-300 mt-1">
                      {cliente.telefone ||
                        "Não informado"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      E-mail
                    </p>

                    <p className="text-sm text-zinc-300 mt-1 break-all">
                      {cliente.email ||
                        "Não informado"}
                    </p>

                  </div>

                </div>

              </div>

              {/* OBSERVAÇÕES */}

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-semibold">
                    Observações
                  </h3>

                  <button
                    onClick={
                      abrirEdicao
                    }
                    className="text-xs text-zinc-500 hover:text-white transition"
                  >
                    Editar
                  </button>

                </div>

                {cliente.observacoes ? (

                  <p className="text-sm text-zinc-400 mt-4 leading-6">
                    {
                      cliente.observacoes
                    }
                  </p>

                ) : (

                  <p className="text-sm text-zinc-600 mt-4">
                    Nenhuma observação cadastrada.
                  </p>

                )}

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* MODAL EDITAR */}

      {mostrarModal && (

        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">

              <div>

                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Cliente
                </p>

                <h3 className="text-xl font-semibold mt-1">
                  Editar cliente
                </h3>

              </div>

              <button
                onClick={
                  fecharEdicao
                }
                className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-xl transition"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                salvarCliente
              }
              className="p-6 space-y-5"
            >

              <div>

                <label className="block text-sm font-medium mb-2">
                  Nome *
                </label>

                <input
                  value={nome}
                  onChange={(e) =>
                    setNome(
                      e.target.value
                    )
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-white transition"
                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">
                  Telefone
                </label>

                <input
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(
                      e.target.value
                    )
                  }
                  type="tel"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-white transition"
                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">
                  E-mail
                </label>

                <input
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  type="email"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-white transition"
                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">
                  Observações
                </label>

                <textarea
                  value={
                    observacoes
                  }
                  onChange={(e) =>
                    setObservacoes(
                      e.target.value
                    )
                  }
                  rows={5}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-white transition resize-none"
                />

              </div>

              {mensagem && (

                <div className="bg-red-950/40 border border-red-900 rounded-xl p-3 text-sm text-red-300">
                  {mensagem}
                </div>

              )}

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={
                    fecharEdicao
                  }
                  className="flex-1 border border-zinc-700 py-3 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}