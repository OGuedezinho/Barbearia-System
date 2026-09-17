"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
};

type FormularioServico = {
  nome: string;
  descricao: string;
  preco: string;
  duracao: string;
};

const formularioInicial: FormularioServico = {
  nome: "",
  descricao: "",
  preco: "",
  duracao: "30",
};

export default function Servicos() {
  const router = useRouter();

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [servicoEditando, setServicoEditando] =
    useState<Servico | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioServico>(formularioInicial);

  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregarServicos() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const {
  barbearia,
  error: erroBarbearia,
} = await getBarbeariaDoUsuario();

if (erroBarbearia || !barbearia) {
  setMensagem(
    "Não foi possível encontrar sua barbearia."
  );
  setCarregando(false);
  return;
}

    const { data, error } = await supabase
      .from("servicos")
      .select(
        "id, nome, descricao, preco, duracao_minutos, ativo"
      )
      .eq("barbearia_id", barbearia.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMensagem("Erro ao carregar os serviços.");
    } else {
      setServicos(data ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarServicos();
  }, []);

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return servicos;
    }

    return servicos.filter((servico) => {
      return (
        servico.nome.toLowerCase().includes(termo) ||
        (servico.descricao ?? "").toLowerCase().includes(termo)
      );
    });
  }, [servicos, busca]);

  const totalServicos = servicos.length;

  const servicosAtivos = servicos.filter(
    (servico) => servico.ativo
  ).length;

  const servicosInativos = totalServicos - servicosAtivos;

  const precoMedio =
    totalServicos > 0
      ? servicos.reduce(
          (total, servico) => total + Number(servico.preco),
          0
        ) / totalServicos
      : 0;

  function formatarPreco(valor: number) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarDuracao(minutos: number) {
    if (minutos < 60) {
      return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const restante = minutos % 60;

    if (restante === 0) {
      return `${horas}h`;
    }

    return `${horas}h ${restante}min`;
  }

  function abrirModalNovo() {
    setServicoEditando(null);
    setFormulario(formularioInicial);
    setMensagem("");
    setModalAberto(true);
  }

  function abrirModalEditar(servico: Servico) {
    setServicoEditando(servico);

    setFormulario({
      nome: servico.nome,
      descricao: servico.descricao ?? "",
      preco: String(servico.preco).replace(".", ","),
      duracao: String(servico.duracao_minutos),
    });

    setMensagem("");
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setModalAberto(false);
    setServicoEditando(null);
    setFormulario(formularioInicial);
    setMensagem("");
  }

  async function salvarServico(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensagem("");

    const nome = formulario.nome.trim();
    const descricao = formulario.descricao.trim();

    const precoNumerico = Number(
      formulario.preco.replace(",", ".")
    );

    const duracaoNumerica = Number(formulario.duracao);

    if (!nome) {
      setMensagem("Digite o nome do serviço.");
      return;
    }

    if (
      !formulario.preco ||
      Number.isNaN(precoNumerico) ||
      precoNumerico < 0
    ) {
      setMensagem("Digite um preço válido.");
      return;
    }

    if (
      !formulario.duracao ||
      Number.isNaN(duracaoNumerica) ||
      duracaoNumerica <= 0
    ) {
      setMensagem("Digite uma duração válida.");
      return;
    }

    setSalvando(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const {
  barbearia,
  error: erroBarbearia,
} = await getBarbeariaDoUsuario();

if (erroBarbearia || !barbearia) {
  setMensagem(
    "Não foi possível encontrar sua barbearia."
  );
  setSalvando(false);
  return;
}

    if (servicoEditando) {
      const { error } = await supabase
        .from("servicos")
        .update({
          nome,
          descricao: descricao || null,
          preco: precoNumerico,
          duracao_minutos: duracaoNumerica,
        })
        .eq("id", servicoEditando.id)
        .eq("barbearia_id", barbearia.id);

      if (error) {
        console.error(error);
        setMensagem("Erro ao atualizar serviço.");
        setSalvando(false);
        return;
      }

      setMensagem("Serviço atualizado com sucesso! ✅");
    } else {
      const { error } = await supabase
        .from("servicos")
        .insert({
          barbearia_id: barbearia.id,
          nome,
          descricao: descricao || null,
          preco: precoNumerico,
          duracao_minutos: duracaoNumerica,
          ativo: true,
        });

      if (error) {
        console.error(error);
        setMensagem("Erro ao cadastrar serviço.");
        setSalvando(false);
        return;
      }

      setMensagem("Serviço cadastrado com sucesso! ✅");
    }

    await carregarServicos();

    setTimeout(() => {
      setModalAberto(false);
      setServicoEditando(null);
      setFormulario(formularioInicial);
      setMensagem("");
    }, 500);

    setSalvando(false);
  }

  async function alterarStatus(
    id: string,
    ativoAtual: boolean
  ) {
    const supabase = createClient();

    const { error } = await supabase
      .from("servicos")
      .update({
        ativo: !ativoAtual,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMensagem("Erro ao alterar status do serviço.");
      return;
    }

    await carregarServicos();
  }

  async function excluirServico(servico: Servico) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o serviço "${servico.nome}"?`
    );

    if (!confirmar) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", servico.id);

    if (error) {
      console.error(error);
      setMensagem("Erro ao excluir serviço.");
      return;
    }

    setMensagem("Serviço excluído com sucesso.");

    await carregarServicos();
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">
            Carregando serviços...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* HEADER */}

      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center text-lg">
                  ✂
                </div>

                <div>
                  <h1 className="text-lg font-bold">
                    Serviços
                  </h1>

                  <p className="text-xs text-zinc-500">
                    Gerencie os serviços da sua barbearia
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="border border-zinc-800 bg-zinc-900 px-4 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 transition"
              >
                ← Dashboard
              </button>

              <button
                onClick={abrirModalNovo}
                className="bg-white text-black font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-zinc-200 transition"
              >
                + Novo serviço
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* TÍTULO */}

        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Catálogo de serviços
          </h2>

          <p className="text-zinc-400 mt-2">
            Defina os serviços, preços e duração dos atendimentos.
          </p>
        </div>

        {/* CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Total de serviços
              </span>

              <span className="text-xl">✂️</span>
            </div>

            <p className="text-3xl font-bold mt-3">
              {totalServicos}
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              Cadastrados no sistema
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Serviços ativos
              </span>

              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </div>

            <p className="text-3xl font-bold mt-3">
              {servicosAtivos}
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              Disponíveis para agendamento
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Inativos
              </span>

              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            </div>

            <p className="text-3xl font-bold mt-3">
              {servicosInativos}
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              Temporariamente desativados
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Preço médio
              </span>

              <span className="text-xl">💰</span>
            </div>

            <p className="text-2xl sm:text-3xl font-bold mt-3">
              {formatarPreco(precoMedio)}
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              Considerando todos os serviços
            </p>
          </div>
        </div>

        {/* MENSAGEM */}

        {mensagem && !modalAberto && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300">
            {mensagem}
          </div>
        )}

        {/* BUSCA + LISTA */}

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-zinc-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  Seus serviços
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  {servicosFiltrados.length} resultado(s)
                </p>
              </div>

              <div className="relative w-full lg:w-80">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  🔎
                </span>

                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar serviço..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-zinc-500 transition"
                />
              </div>
            </div>
          </div>

          {servicos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-2xl mb-5">
                ✂️
              </div>

              <h4 className="text-lg font-semibold">
                Nenhum serviço cadastrado
              </h4>

              <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                Cadastre seu primeiro serviço para começar a
                organizar os atendimentos da barbearia.
              </p>

              <button
                onClick={abrirModalNovo}
                className="mt-6 bg-white text-black font-semibold px-5 py-3 rounded-xl text-sm hover:bg-zinc-200 transition"
              >
                + Cadastrar primeiro serviço
              </button>
            </div>
          ) : servicosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-400">
                Nenhum serviço encontrado.
              </p>

              <button
                onClick={() => setBusca("")}
                className="mt-3 text-sm text-white hover:underline"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {servicosFiltrados.map((servico) => (
                <div
                  key={servico.id}
                  className="p-5 sm:p-6 hover:bg-zinc-800/30 transition"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    {/* INFORMAÇÕES */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-semibold text-lg">
                          {servico.nome}
                        </h4>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border ${
                            servico.ativo
                              ? "bg-green-950/40 border-green-900 text-green-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500"
                          }`}
                        >
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />

                          {servico.ativo
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </div>

                      {servico.descricao ? (
                        <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                          {servico.descricao}
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-600 mt-2">
                          Sem descrição
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-5 mt-4">
                        <div>
                          <p className="text-xs text-zinc-500">
                            Preço
                          </p>

                          <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                            {formatarPreco(servico.preco)}
                          </p>
                        </div>

                        <div className="w-px h-8 bg-zinc-800" />

                        <div>
                          <p className="text-xs text-zinc-500">
                            Duração
                          </p>

                          <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                            {formatarDuracao(
                              servico.duracao_minutos
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AÇÕES */}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          alterarStatus(
                            servico.id,
                            servico.ativo
                          )
                        }
                        className="border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 transition"
                      >
                        {servico.ativo
                          ? "Desativar"
                          : "Ativar"}
                      </button>

                      <button
                        onClick={() =>
                          abrirModalEditar(servico)
                        }
                        className="border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 transition"
                      >
                        ✏️ Editar
                      </button>

                      <button
                        onClick={() =>
                          excluirServico(servico)
                        }
                        className="border border-red-950 bg-red-950/20 text-red-400 px-3.5 py-2.5 rounded-xl text-sm hover:bg-red-950/40 transition"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DICA */}

        {servicos.length > 0 && (
          <div className="mt-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="text-lg">💡</div>

              <div>
                <p className="text-sm font-medium">
                  Dica
                </p>

                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  A duração cadastrada aqui é usada pela Agenda
                  para calcular o tamanho de cada atendimento.
                  Serviços inativos não precisam ser excluídos:
                  você pode ativá-los novamente quando quiser.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODAL */}

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              fecharModal();
            }
          }}
        >
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* CABEÇALHO DO MODAL */}

            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div>
                <h3 className="text-xl font-semibold">
                  {servicoEditando
                    ? "Editar serviço"
                    : "Novo serviço"}
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  {servicoEditando
                    ? "Atualize as informações do serviço."
                    : "Cadastre um novo serviço para sua barbearia."}
                </p>
              </div>

              <button
                onClick={fecharModal}
                disabled={salvando}
                className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO */}

            <form
              onSubmit={salvarServico}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome *
                </label>

                <input
                  type="text"
                  value={formulario.nome}
                  onChange={(e) =>
                    setFormulario((atual) => ({
                      ...atual,
                      nome: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Corte masculino"
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descrição
                </label>

                <textarea
                  value={formulario.descricao}
                  onChange={(e) =>
                    setFormulario((atual) => ({
                      ...atual,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Descreva o serviço..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-zinc-500 resize-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preço *
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      R$
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={formulario.preco}
                      onChange={(e) =>
                        setFormulario((atual) => ({
                          ...atual,
                          preco: e.target.value,
                        }))
                      }
                      placeholder="35,00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duração *
                  </label>

                  <select
                    value={formulario.duracao}
                    onChange={(e) =>
                      setFormulario((atual) => ({
                        ...atual,
                        duracao: e.target.value,
                      }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-zinc-500 transition"
                  >
                    <option value="15">
                      15 minutos
                    </option>

                    <option value="20">
                      20 minutos
                    </option>

                    <option value="30">
                      30 minutos
                    </option>

                    <option value="45">
                      45 minutos
                    </option>

                    <option value="60">
                      1 hora
                    </option>

                    <option value="75">
                      1h 15min
                    </option>

                    <option value="90">
                      1h 30min
                    </option>

                    <option value="120">
                      2 horas
                    </option>
                  </select>
                </div>
              </div>

              {mensagem && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-center text-zinc-300">
                  {mensagem}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="flex-1 border border-zinc-700 py-3 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : servicoEditando
                    ? "Salvar alterações"
                    : "Cadastrar serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}