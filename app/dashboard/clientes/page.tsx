"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Cliente = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
};

type UltimaPresenca = {
  cliente_id: string;
  data_hora: string;
};

export default function ClientesPage() {
  const router = useRouter();

  const [barbeariaId, setBarbeariaId] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ultimasPresencas, setUltimasPresencas] = useState<
    Record<string, string>
  >({});

  const [busca, setBusca] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);

    const supabase = createClient();

    const {
      barbearia,
      error: erroBarbearia,
    } = await getBarbeariaDoUsuario();

    if (erroBarbearia || !barbearia) {
      console.error(
        "ERRO AO BUSCAR BARBEARIA:",
        erroBarbearia
      );

      setMensagem(
        "Não foi possível encontrar sua barbearia."
      );
      setCarregando(false);
      return;
    }

    setBarbeariaId(barbearia.id);

    const [
      { data: clientesData, error: clientesError },
      { data: agendamentosData, error: agendamentosError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select(
          "id, barbearia_id, nome, telefone, email, observacoes"
        )
        .eq("barbearia_id", barbearia.id)
        .order("nome", { ascending: true }),

      supabase
        .from("agendamentos")
        .select("cliente_id, data_hora, status")
        .eq("barbearia_id", barbearia.id)
        .eq("status", "concluido")
        .order("data_hora", { ascending: false }),
    ]);

    if (clientesError) {
      console.error(
        "ERRO AO CARREGAR CLIENTES:",
        JSON.stringify(clientesError, null, 2)
      );
      setMensagem("Erro ao carregar os clientes.");
    } else {
      setClientes(clientesData ?? []);
    }

    if (agendamentosError) {
      console.error(
        "ERRO AO CARREGAR PRESENÇAS:",
        JSON.stringify(agendamentosError, null, 2)
      );
    } else {
      const mapa: Record<string, string> = {};

      for (const agendamento of agendamentosData ?? []) {
        if (!mapa[agendamento.cliente_id]) {
          mapa[agendamento.cliente_id] = agendamento.data_hora;
        }
      }

      setUltimasPresencas(mapa);
    }

    setCarregando(false);
  }

  function abrirNovoCliente() {
    setNome("");
    setTelefone("");
    setEmail("");
    setObservacoes("");
    setMensagem("");
    setMostrarModal(true);
  }

  function fecharModal() {
    if (salvando) return;
    setMostrarModal(false);
    setMensagem("");
  }

  async function criarCliente(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMensagem("");

    if (!nome.trim()) {
      setMensagem("Informe o nome do cliente.");
      return;
    }

    if (!barbeariaId) {
      setMensagem("Barbearia não encontrada.");
      return;
    }

    setSalvando(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        barbearia_id: barbeariaId,
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        observacoes: observacoes.trim() || null,
      })
      .select(
        "id, barbearia_id, nome, telefone, email, observacoes"
      )
      .single();

    if (error) {
      console.error(
        "ERRO AO CRIAR CLIENTE:",
        JSON.stringify(error, null, 2)
      );

      setMensagem("Não foi possível cadastrar o cliente.");
      setSalvando(false);
      return;
    }

    if (data) {
      setClientes((atual) =>
        [...atual, data].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        )
      );
    }

    setMostrarModal(false);
    setNome("");
    setTelefone("");
    setEmail("");
    setObservacoes("");
    setMensagem("");
    setSalvando(false);
  }

  async function excluirCliente(cliente: Cliente) {
    const confirmar = window.confirm(
      `Deseja realmente excluir o cliente "${cliente.nome}"?`
    );

    if (!confirmar) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", cliente.id)
      .eq("barbearia_id", barbeariaId);

    if (error) {
      console.error(
        "ERRO AO EXCLUIR CLIENTE:",
        JSON.stringify(error, null, 2)
      );
      setMensagem("Não foi possível excluir o cliente.");
      return;
    }

    setClientes((atual) =>
      atual.filter((item) => item.id !== cliente.id)
    );

    setUltimasPresencas((atual) => {
      const novo = { ...atual };
      delete novo[cliente.id];
      return novo;
    });
  }

  function obterIniciais(nomeCliente: string) {
    const partes = nomeCliente
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) return "?";
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return (
      partes[0][0] +
      partes[partes.length - 1][0]
    ).toUpperCase();
  }

  function formatarTempoDesdePresenca(dataHora: string | undefined) {
    if (!dataHora) {
      return "Nunca compareceu";
    }

    const data = new Date(dataHora);
    const agora = new Date();
    const diferencaMs = Math.max(
      0,
      agora.getTime() - data.getTime()
    );

    const minutos = Math.floor(diferencaMs / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    const semanas = Math.floor(dias / 7);
    const meses = Math.floor(dias / 30);

    if (minutos < 60) {
      return `Há ${Math.max(1, minutos)} min`;
    }

    if (horas < 24) {
      return `Há ${horas}h`;
    }

    if (dias < 7) {
      return `Há ${dias} dia${dias !== 1 ? "s" : ""}`;
    }

    if (dias < 30) {
      return `Há ${semanas} semana${semanas !== 1 ? "s" : ""}`;
    }

    return `Há ${meses} mês${meses !== 1 ? "es" : ""}`;
  }

  function obterPercentualPresenca(dataHora: string | undefined) {
    if (!dataHora) return 0;

    const diferencaMs = Math.max(
      0,
      new Date().getTime() - new Date(dataHora).getTime()
    );

    const dias = diferencaMs / (1000 * 60 * 60 * 24);

    return Math.max(
      5,
      Math.min(100, Math.round(100 - (dias / 30) * 95))
    );
  }

  function formatarDataPresenca(dataHora: string | undefined) {
    if (!dataHora) return "Sem histórico de atendimento concluído";

    return new Date(dataHora).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return clientes;

    return clientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(termo) ||
      cliente.telefone?.toLowerCase().includes(termo) ||
      cliente.email?.toLowerCase().includes(termo)
    );
  }, [clientes, busca]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
        <div className="px-4 md:px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-10 h-10 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ←
              </button>

              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Gestão
                </p>
                <h1 className="text-xl md:text-2xl font-bold mt-1">
                  Clientes
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  Acompanhe seus clientes e a última presença de cada um.
                </p>
              </div>
            </div>

            <button
              onClick={abrirNovoCliente}
              className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition"
            >
              + Novo cliente
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Clientes
              </p>
              <p className="text-xl font-bold mt-1">{clientes.length}</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Com histórico
              </p>
              <p className="text-xl font-bold mt-1 text-emerald-400">
                {Object.keys(ultimasPresencas).length}
              </p>
            </div>

            <div className="hidden md:block bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Resultado
              </p>
              <p className="text-xl font-bold mt-1">
                {clientesFiltrados.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-5">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-zinc-600"
            />
          </div>

          {mensagem && !mostrarModal && (
            <div className="mb-5 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300">
              {mensagem}
            </div>
          )}

          {carregando ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-sm text-zinc-500 mt-4">
                Carregando clientes...
              </p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <div className="text-3xl">👤</div>
              <h2 className="text-lg font-semibold mt-4">
                {clientes.length === 0
                  ? "Nenhum cliente cadastrado"
                  : "Nenhum cliente encontrado"}
              </h2>
              <p className="text-sm text-zinc-500 mt-2">
                {clientes.length === 0
                  ? "Cadastre o primeiro cliente para começar."
                  : "Tente buscar por outro nome, telefone ou e-mail."}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Lista de clientes</h2>
                  <p className="text-xs text-zinc-600 mt-1">
                    A barra mostra o tempo desde a última presença concluída.
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {clientesFiltrados.length} resultado
                  {clientesFiltrados.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-zinc-800">
                {clientesFiltrados.map((cliente) => {
                  const ultimaPresenca =
                    ultimasPresencas[cliente.id];
                  const percentual = obterPercentualPresenca(
                    ultimaPresenca
                  );

                  return (
                    <div
                      key={cliente.id}
                      className="p-4 md:p-5 hover:bg-zinc-800/40 transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/clientes/${cliente.id}`
                            )
                          }
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        >
                          <div className="w-11 h-11 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-sm">
                            {obterIniciais(cliente.nome)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">
                              {cliente.nome}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1 truncate">
                              {cliente.telefone ||
                                cliente.email ||
                                "Sem contato cadastrado"}
                            </p>
                          </div>
                        </button>

                        <div className="w-full lg:w-[360px]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                                Última presença
                              </p>
                              <p
                                className={`text-sm font-semibold mt-0.5 ${
                                  ultimaPresenca
                                    ? "text-zinc-200"
                                    : "text-zinc-500"
                                }`}
                              >
                                {formatarTempoDesdePresenca(
                                  ultimaPresenca
                                )}
                              </p>
                            </div>

                            <p className="text-[10px] text-zinc-600 text-right">
                              {formatarDataPresenca(ultimaPresenca)}
                            </p>
                          </div>

                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentual}%`,
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => excluirCliente(cliente)}
                          className="self-end lg:self-center shrink-0 border border-red-900 text-red-400 px-3 py-2 rounded-lg text-xs hover:bg-red-950/30 transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Clientes
                </p>
                <h2 className="text-xl font-semibold mt-1">
                  Novo cliente
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-xl transition"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={criarCliente}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                  placeholder="Preferências, observações..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white resize-none"
                />
              </div>

              {mensagem && (
                <div className="bg-red-950/40 border border-red-900 rounded-lg p-3 text-sm text-red-300 text-center">
                  {mensagem}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="flex-1 border border-zinc-700 py-3 rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando ? "Cadastrando..." : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
