"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Pagamento = {
  id: string;
  barbearia_id: string;
  agendamento_id: string | null;
  profissional_id: string | null;
  cliente_id: string | null;
  valor: number;
  forma_pagamento: string;
  status: string;
  descricao: string | null;
  data_pagamento: string;
  criado_em: string;
};

type Cliente = {
  id: string;
  nome: string;
};

type Profissional = {
  id: string;
  nome: string;
};

const formasPagamento = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

const statusPagamento = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
];

export default function FinanceiroPage() {
  const supabase = createClient();

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [barbeariaId, setBarbeariaId] = useState<string | null>(null);

  const [tipoUsuario, setTipoUsuario] = useState<
    "dono" | "membro" | null
  >(null);

  const [cargo, setCargo] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [status, setStatus] = useState("pago");
  const [descricao, setDescricao] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");

  const [filtroPeriodo, setFiltroPeriodo] = useState("30");
  const [filtroForma, setFiltroForma] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const podeMexerNoFinanceiro =
    tipoUsuario === "dono" ||
    tipoUsuario === "membro";

  const podeExcluirPagamento =
    tipoUsuario === "dono";

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);

    const {
      barbearia,
      error: erroBarbearia,
      tipoUsuario: tipoUsuarioAtual,
      cargo: cargoAtual,
    } = await getBarbeariaDoUsuario();

    if (erroBarbearia || !barbearia) {
      console.error(
        "ERRO AO BUSCAR BARBEARIA:",
        erroBarbearia
      );

      setLoading(false);
      return;
    }

    setBarbeariaId(barbearia.id);
    setTipoUsuario(tipoUsuarioAtual);
    setCargo(cargoAtual);

    const [
      { data: pagamentosData, error: pagamentosError },
      { data: clientesData, error: clientesError },
      { data: profissionaisData, error: profissionaisError },
    ] = await Promise.all([
      supabase
        .from("pagamentos")
        .select("*")
        .eq("barbearia_id", barbearia.id)
        .order("data_pagamento", {
          ascending: false,
        }),

      supabase
        .from("clientes")
        .select("id, nome")
        .eq("barbearia_id", barbearia.id)
        .order("nome", {
          ascending: true,
        }),

      supabase
        .from("profissionais")
        .select("id, nome")
        .eq("barbearia_id", barbearia.id)
        .order("nome", {
          ascending: true,
        }),
    ]);

    if (pagamentosError) {
      console.error(
        "ERRO AO CARREGAR PAGAMENTOS:",
        pagamentosError
      );
    }

    if (clientesError) {
      console.error(
        "ERRO AO CARREGAR CLIENTES:",
        clientesError
      );
    }

    if (profissionaisError) {
      console.error(
        "ERRO AO CARREGAR PROFISSIONAIS:",
        profissionaisError
      );
    }

    setPagamentos(pagamentosData || []);
    setClientes(clientesData || []);
    setProfissionais(profissionaisData || []);

    setLoading(false);
  }

  function abrirNovoPagamento() {
    if (!podeMexerNoFinanceiro) {
      return;
    }

    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(
      agora.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      agora.getDate()
    ).padStart(2, "0");

    setClienteId("");
    setProfissionalId("");
    setValor("");
    setFormaPagamento("pix");
    setStatus("pago");
    setDescricao("");

    setDataPagamento(
      `${ano}-${mes}-${dia}`
    );

    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setModalAberto(false);
  }

  async function salvarPagamento(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!podeMexerNoFinanceiro) {
      return;
    }

    if (!barbeariaId) {
      alert("Barbearia não encontrada.");
      return;
    }

    const valorNumerico = Number(
      valor.replace(",", ".")
    );

    if (
      !valor ||
      Number.isNaN(valorNumerico) ||
      valorNumerico <= 0
    ) {
      alert("Digite um valor válido.");
      return;
    }

    if (!dataPagamento) {
      alert("Informe a data do pagamento.");
      return;
    }

    setSalvando(true);

    const dataISO = new Date(
      `${dataPagamento}T12:00:00`
    ).toISOString();

    const { error } = await supabase
      .from("pagamentos")
      .insert({
        barbearia_id: barbeariaId,
        cliente_id: clienteId || null,
        profissional_id:
          profissionalId || null,
        valor: valorNumerico,
        forma_pagamento:
          formaPagamento,
        status,
        descricao:
          descricao.trim() || null,
        data_pagamento: dataISO,
      });

    if (error) {
      console.error(
        "ERRO AO REGISTRAR PAGAMENTO:",
        error
      );

      alert(
        "Não foi possível registrar o pagamento."
      );

      setSalvando(false);
      return;
    }

    await carregarDados();

    setSalvando(false);
    setModalAberto(false);
  }

  async function alterarStatus(
    pagamento: Pagamento,
    novoStatus: string
  ) {
    if (!podeMexerNoFinanceiro) {
      return;
    }

    if (!barbeariaId) {
      return;
    }

    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: novoStatus,
      })
      .eq("id", pagamento.id)
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO ALTERAR STATUS:",
        error
      );

      alert(
        "Não foi possível alterar o status."
      );

      return;
    }

    setPagamentos((lista) =>
      lista.map((item) =>
        item.id === pagamento.id
          ? {
              ...item,
              status: novoStatus,
            }
          : item
      )
    );
  }

  async function excluirPagamento(
    pagamento: Pagamento
  ) {
    if (!podeExcluirPagamento) {
      return;
    }

    if (!barbeariaId) {
      return;
    }

    const confirmar = confirm(
      "Tem certeza que deseja excluir este pagamento?"
    );

    if (!confirmar) {
      return;
    }

    const { error } = await supabase
      .from("pagamentos")
      .delete()
      .eq("id", pagamento.id)
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO EXCLUIR PAGAMENTO:",
        error
      );

      alert(
        "Não foi possível excluir o pagamento."
      );

      return;
    }

    setPagamentos((lista) =>
      lista.filter(
        (item) =>
          item.id !== pagamento.id
      )
    );
  }

  function nomeCliente(
    id: string | null
  ) {
    if (!id) {
      return "Cliente avulso";
    }

    return (
      clientes.find(
        (cliente) =>
          cliente.id === id
      )?.nome ||
      "Cliente não encontrado"
    );
  }

  function nomeProfissional(
    id: string | null
  ) {
    if (!id) {
      return "Não informado";
    }

    return (
      profissionais.find(
        (profissional) =>
          profissional.id === id
      )?.nome ||
      "Profissional não encontrado"
    );
  }

  function formatarMoeda(
    valor: number
  ) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function formatarData(
    data: string
  ) {
    return new Date(
      data
    ).toLocaleDateString(
      "pt-BR"
    );
  }

  function formatarFormaPagamento(
    forma: string
  ) {
    const encontrada =
      formasPagamento.find(
        (item) =>
          item.value === forma
      );

    return (
      encontrada?.label ||
      forma
    );
  }

  const pagamentosFiltrados =
    useMemo(() => {
      const agora = new Date();

      return pagamentos.filter(
        (pagamento) => {
          const data = new Date(
            pagamento.data_pagamento
          );

          if (
            filtroPeriodo !==
            "todos"
          ) {
            const dias = Number(
              filtroPeriodo
            );

            const limite =
              new Date(agora);

            limite.setDate(
              limite.getDate() -
                dias
            );

            if (
              data < limite
            ) {
              return false;
            }
          }

          if (
            filtroForma !==
              "todos" &&
            pagamento.forma_pagamento !==
              filtroForma
          ) {
            return false;
          }

          if (
            filtroStatus !==
              "todos" &&
            pagamento.status !==
              filtroStatus
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      pagamentos,
      filtroPeriodo,
      filtroForma,
      filtroStatus,
    ]);

  const pagamentosPagos =
    pagamentosFiltrados.filter(
      (item) =>
        item.status === "pago"
    );

  const totalRecebido =
    pagamentosPagos.reduce(
      (
        total,
        pagamento
      ) =>
        total +
        Number(
          pagamento.valor
        ),
      0
    );

  const totalPendente =
    pagamentosFiltrados
      .filter(
        (item) =>
          item.status ===
          "pendente"
      )
      .reduce(
        (
          total,
          pagamento
        ) =>
          total +
          Number(
            pagamento.valor
          ),
        0
      );

  const quantidadePagamentos =
    pagamentosPagos.length;

  const ticketMedio =
    quantidadePagamentos >
    0
      ? totalRecebido /
        quantidadePagamentos
      : 0;

  const porForma =
    formasPagamento.map(
      (forma) => {
        const total =
          pagamentosPagos
            .filter(
              (pagamento) =>
                pagamento.forma_pagamento ===
                forma.value
            )
            .reduce(
              (
                soma,
                pagamento
              ) =>
                soma +
                Number(
                  pagamento.valor
                ),
              0
            );

        return {
          ...forma,
          total,
        };
      }
    );

  const maiorForma =
    Math.max(
      ...porForma.map(
        (item) =>
          item.total
      ),
      1
    );

  const totalCancelado =
    pagamentosFiltrados
      .filter(
        (item) =>
          item.status ===
          "cancelado"
      )
      .reduce(
        (
          total,
          pagamento
        ) =>
          total +
          Number(
            pagamento.valor
          ),
        0
      );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />

          <p className="text-sm text-zinc-500">
            Carregando financeiro...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-zinc-500">
              Controle financeiro
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Financeiro
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Acompanhe os recebimentos e movimentações da barbearia.
            </p>

            {tipoUsuario ===
              "membro" && (
              <p className="mt-2 text-xs text-zinc-600">
                {cargo || "Membro"} •
                acesso financeiro
                habilitado
              </p>
            )}
          </div>

          {podeMexerNoFinanceiro && (
            <button
              type="button"
              onClick={
                abrirNovoPagamento
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              + Novo pagamento
            </button>
          )}
        </div>

        {/* CARDS */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              Total recebido
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatarMoeda(
                totalRecebido
              )}
            </p>

            <p className="mt-2 text-xs text-emerald-400">
              Pagamentos concluídos
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              Pendente
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatarMoeda(
                totalPendente
              )}
            </p>

            <p className="mt-2 text-xs text-yellow-500">
              A receber
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              Ticket médio
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatarMoeda(
                ticketMedio
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              Por pagamento
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              Pagamentos
            </p>

            <p className="mt-2 text-2xl font-bold">
              {quantidadePagamentos}
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              No período selecionado
            </p>
          </div>
        </div>

        {/* GRÁFICOS / RESUMO */}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* FORMAS DE PAGAMENTO */}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6">
              <h2 className="font-semibold">
                Formas de pagamento
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Distribuição dos recebimentos
              </p>
            </div>

            <div className="space-y-5">
              {porForma.map(
                (forma) => (
                  <div
                    key={
                      forma.value
                    }
                  >
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-zinc-400">
                        {forma.label}
                      </span>

                      <span className="font-medium">
                        {formatarMoeda(
                          forma.total
                        )}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{
                          width: `${Math.max(
                            (forma.total /
                              maiorForma) *
                              100,
                            forma.total >
                              0
                              ? 5
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* RESUMO */}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6">
              <h2 className="font-semibold">
                Resumo
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Visão geral dos pagamentos
              </p>
            </div>

            <div className="space-y-4">

              <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-4">
                <span className="text-sm text-zinc-400">
                  Recebido
                </span>

                <span className="font-semibold text-emerald-400">
                  {formatarMoeda(
                    totalRecebido
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-4">
                <span className="text-sm text-zinc-400">
                  Pendente
                </span>

                <span className="font-semibold text-yellow-400">
                  {formatarMoeda(
                    totalPendente
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-4">
                <span className="text-sm text-zinc-400">
                  Cancelado
                </span>

                <span className="font-semibold text-red-400">
                  {formatarMoeda(
                    totalCancelado
                  )}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* FILTROS */}

        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-col gap-3 md:flex-row">

            <select
              value={
                filtroPeriodo
              }
              onChange={(e) =>
                setFiltroPeriodo(
                  e.target.value
                )
              }
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="7">
                Últimos 7 dias
              </option>

              <option value="30">
                Últimos 30 dias
              </option>

              <option value="90">
                Últimos 90 dias
              </option>

              <option value="todos">
                Todo o período
              </option>
            </select>

            <select
              value={filtroForma}
              onChange={(e) =>
                setFiltroForma(
                  e.target.value
                )
              }
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="todos">
                Todas as formas
              </option>

              {formasPagamento.map(
                (forma) => (
                  <option
                    key={
                      forma.value
                    }
                    value={
                      forma.value
                    }
                  >
                    {forma.label}
                  </option>
                )
              )}
            </select>

            <select
              value={
                filtroStatus
              }
              onChange={(e) =>
                setFiltroStatus(
                  e.target.value
                )
              }
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="todos">
                Todos os status
              </option>

              {statusPagamento.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

          </div>
        </div>

        {/* PAGAMENTOS */}

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">

          <div className="border-b border-zinc-800 p-6">
            <h2 className="font-semibold">
              Últimos pagamentos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Movimentações financeiras da barbearia
            </p>
          </div>

          {pagamentosFiltrados.length ===
          0 ? (
            <div className="p-12 text-center">

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl">
                💰
              </div>

              <h3 className="font-semibold">
                Nenhum pagamento encontrado
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                {podeMexerNoFinanceiro
                  ? "Registre seu primeiro pagamento para começar."
                  : "Ainda não existem pagamentos registrados para este período."}
              </p>

              {podeMexerNoFinanceiro && (
                <button
                  type="button"
                  onClick={
                    abrirNovoPagamento
                  }
                  className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
                >
                  + Novo pagamento
                </button>
              )}

            </div>
          ) : (
            <div className="divide-y divide-zinc-800">

              {pagamentosFiltrados.map(
                (pagamento) => (
                  <div
                    key={
                      pagamento.id
                    }
                    className="flex flex-col gap-4 p-5 transition hover:bg-zinc-950/50 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                        💰
                      </div>

                      <div>

                        <p className="font-medium">
                          {nomeCliente(
                            pagamento.cliente_id
                          )}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {nomeProfissional(
                            pagamento.profissional_id
                          )}
                          {" • "}
                          {formatarData(
                            pagamento.data_pagamento
                          )}
                        </p>

                        {pagamento.descricao && (
                          <p className="mt-1 text-xs text-zinc-600">
                            {
                              pagamento.descricao
                            }
                          </p>
                        )}

                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">

                      <span className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
                        {formatarFormaPagamento(
                          pagamento.forma_pagamento
                        )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          pagamento.status ===
                          "pago"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : pagamento.status ===
                              "pendente"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {pagamento.status ===
                        "pago"
                          ? "Pago"
                          : pagamento.status ===
                            "pendente"
                          ? "Pendente"
                          : "Cancelado"}
                      </span>

                      <span className="min-w-28 text-right font-semibold">
                        {formatarMoeda(
                          Number(
                            pagamento.valor
                          )
                        )}
                      </span>

                      {podeMexerNoFinanceiro && (
                        <select
                          value={
                            pagamento.status
                          }
                          onChange={(
                            e
                          ) =>
                            alterarStatus(
                              pagamento,
                              e.target
                                .value
                            )
                          }
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs outline-none"
                        >
                          {statusPagamento.map(
                            (item) => (
                              <option
                                key={
                                  item.value
                                }
                                value={
                                  item.value
                                }
                              >
                                {
                                  item.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      )}

                      {podeExcluirPagamento && (
                        <button
                          type="button"
                          onClick={() =>
                            excluirPagamento(
                              pagamento
                            )
                          }
                          className="rounded-lg border border-red-900/50 px-3 py-2 text-xs text-red-400 transition hover:bg-red-950/30"
                        >
                          Excluir
                        </button>
                      )}

                    </div>
                  </div>
                )
              )}

            </div>
          )}

        </div>
      </div>

      {/* MODAL NOVO PAGAMENTO */}

      {modalAberto &&
        podeMexerNoFinanceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold">
                  Novo pagamento
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Registre um recebimento da barbearia.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fecharModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                salvarPagamento
              }
              className="p-6"
            >

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* CLIENTE */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Cliente
                  </label>

                  <select
                    value={
                      clienteId
                    }
                    onChange={(e) =>
                      setClienteId(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    <option value="">
                      Cliente avulso
                    </option>

                    {clientes.map(
                      (cliente) => (
                        <option
                          key={
                            cliente.id
                          }
                          value={
                            cliente.id
                          }
                        >
                          {
                            cliente.nome
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* PROFISSIONAL */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Profissional
                  </label>

                  <select
                    value={
                      profissionalId
                    }
                    onChange={(e) =>
                      setProfissionalId(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    <option value="">
                      Não informado
                    </option>

                    {profissionais.map(
                      (
                        profissional
                      ) => (
                        <option
                          key={
                            profissional.id
                          }
                          value={
                            profissional.id
                          }
                        >
                          {
                            profissional.nome
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* VALOR */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Valor
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      R$
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        valor
                      }
                      onChange={(e) =>
                        setValor(
                          e.target
                            .value
                        )
                      }
                      placeholder="0,00"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                    />
                  </div>
                </div>

                {/* DATA */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Data do pagamento
                  </label>

                  <input
                    type="date"
                    value={
                      dataPagamento
                    }
                    onChange={(e) =>
                      setDataPagamento(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  />
                </div>

                {/* FORMA */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Forma de pagamento
                  </label>

                  <select
                    value={
                      formaPagamento
                    }
                    onChange={(e) =>
                      setFormaPagamento(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {formasPagamento.map(
                      (forma) => (
                        <option
                          key={
                            forma.value
                          }
                          value={
                            forma.value
                          }
                        >
                          {
                            forma.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* STATUS */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Status
                  </label>

                  <select
                    value={
                      status
                    }
                    onChange={(e) =>
                      setStatus(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {statusPagamento.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* DESCRIÇÃO */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Descrição
                  </label>

                  <textarea
                    value={
                      descricao
                    }
                    onChange={(e) =>
                      setDescricao(
                        e.target
                          .value
                      )
                    }
                    placeholder="Ex.: Corte + barba"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

              </div>

              {/* BOTÕES */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Registrar pagamento"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}