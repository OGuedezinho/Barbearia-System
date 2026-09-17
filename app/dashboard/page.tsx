"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Cliente = {
  id: string;
  nome: string;
};

type Servico = {
  id: string;
  nome: string;
  preco: number | null;
};

type Agendamento = {
  id: string;
  data_hora: string;
  status: string | null;
  cliente_id: string | null;
  servico_id: string | null;
  cliente: {
    nome: string;
  } | null;
  servico: {
    nome: string;
    preco: number | null;
  } | null;
};

type DashboardData = {
  barbeariaNome: string;
  usuarioNome: string;
  clientes: Cliente[];
  servicos: Servico[];
  agendamentos: Agendamento[];
};

export default function Dashboard() {
  const router = useRouter();

  const [dados, setDados] = useState<DashboardData>({
    barbeariaNome: "Barbearia",
    usuarioNome: "Usuário",
    clientes: [],
    servicos: [],
    agendamentos: [],
  });

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const hoje = useMemo(() => {
    const data = new Date();

    data.setHours(0, 0, 0, 0);

    return data;
  }, []);

  const inicioMes = useMemo(() => {
    const data = new Date();

    data.setDate(1);
    data.setHours(0, 0, 0, 0);

    return data;
  }, []);

  const fimBusca = useMemo(() => {
    const data = new Date();

    data.setDate(data.getDate() + 31);
    data.setHours(23, 59, 59, 999);

    return data;
  }, []);

  function mesmoDia(
    data1: Date,
    data2: Date
  ) {
    return (
      data1.getFullYear() === data2.getFullYear() &&
      data1.getMonth() === data2.getMonth() &&
      data1.getDate() === data2.getDate()
    );
  }

  function statusNormalizado(
    status: string | null
  ) {
    return (status || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function estaCancelado(
    status: string | null
  ) {
    const valor = statusNormalizado(status);

    return (
      valor === "cancelado" ||
      valor === "cancelada"
    );
  }

  function estaConcluido(
    status: string | null
  ) {
    const valor = statusNormalizado(status);

    return (
      valor === "concluido" ||
      valor === "concluida" ||
      valor === "finalizado" ||
      valor === "finalizada"
    );
  }

  function formatarMoeda(
    valor: number
  ) {
    return Number(valor || 0).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function formatarHora(
    dataHora: string
  ) {
    return new Date(dataHora).toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatarData(
    dataHora: string
  ) {
    return new Date(dataHora).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
      }
    );
  }

  function formatarDiaSemana(
    data: Date
  ) {
    return data
      .toLocaleDateString(
        "pt-BR",
        {
          weekday: "short",
        }
      )
      .replace(".", "");
  }

  async function carregarDashboard(
    mostrarAtualizando = false
  ) {
    if (mostrarAtualizando) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setMensagem("");

    const supabase = createClient();

    try {
      /*
       * ==========================
       * USUÁRIO
       * ==========================
       */

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const nomeUsuario =
        user.user_metadata?.nome ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Usuário";

      /*
       * ==========================
       * BARBEARIA
       * ==========================
       */

      const {
  barbearia,
  error: erroBarbearia,
  tipoUsuario,
  cargo,
} = await getBarbeariaDoUsuario();

if (erroBarbearia || !barbearia) {
  console.error(
    "Erro ao encontrar barbearia:",
    erroBarbearia
  );

  setMensagem(
    "Não foi possível encontrar sua barbearia."
  );

  return;
}

console.log(
  "Barbearia encontrada:",
  barbearia.nome
);

console.log(
  "Tipo de usuário:",
  tipoUsuario
);

console.log(
  "Cargo:",
  cargo
);

      /*
       * ==========================
       * CLIENTES
       * ==========================
       */

      const {
        data: clientesData,
        error: erroClientes,
      } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq(
          "barbearia_id",
          barbearia.id
        )
        .order("nome", {
          ascending: true,
        });

      if (erroClientes) {
        console.error(
          "Erro ao carregar clientes:",
          erroClientes
        );
      }

      /*
       * ==========================
       * SERVIÇOS
       * ==========================
       */

      const {
        data: servicosData,
        error: erroServicos,
      } = await supabase
        .from("servicos")
        .select("id, nome, preco")
        .eq(
          "barbearia_id",
          barbearia.id
        )
        .order("nome", {
          ascending: true,
        });

      if (erroServicos) {
        console.error(
          "Erro ao carregar serviços:",
          erroServicos
        );
      }

      /*
       * ==========================
       * AGENDAMENTOS
       * ==========================
       *
       * Buscamos desde o início do mês
       * para o faturamento mensal ficar
       * correto.
       */

      const {
        data: agendamentosData,
        error: erroAgendamentos,
      } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          cliente_id,
          servico_id,
          clientes (
            nome
          ),
          servicos (
            nome,
            preco
          )
        `)
        .eq(
          "barbearia_id",
          barbearia.id
        )
        .gte(
          "data_hora",
          inicioMes.toISOString()
        )
        .lte(
          "data_hora",
          fimBusca.toISOString()
        )
        .order("data_hora", {
          ascending: true,
        });

      if (erroAgendamentos) {
        console.error(
          "Erro ao carregar agendamentos:",
          erroAgendamentos
        );

        setMensagem(
          "Não foi possível carregar os agendamentos."
        );
      }

      /*
       * O Supabase pode retornar os relacionamentos
       * como objeto ou array dependendo da relação.
       *
       * Aqui normalizamos para o formato usado
       * pelo Dashboard.
       */

      const agendamentosNormalizados: Agendamento[] =
        (agendamentosData || []).map(
          (item: any) => {
            const clienteBruto =
              item.clientes;

            const servicoBruto =
              item.servicos;

            const cliente =
              Array.isArray(
                clienteBruto
              )
                ? clienteBruto[0] || null
                : clienteBruto || null;

            const servico =
              Array.isArray(
                servicoBruto
              )
                ? servicoBruto[0] || null
                : servicoBruto || null;

            return {
              id: item.id,
              data_hora:
                item.data_hora,
              status:
                item.status,
              cliente_id:
                item.cliente_id,
              servico_id:
                item.servico_id,
              cliente,
              servico,
            };
          }
        );

      setDados({
        barbeariaNome:
          barbearia.nome ||
          "Barbearia",

        usuarioNome:
          nomeUsuario,

        clientes:
          (clientesData as Cliente[]) ||
          [],

        servicos:
          (servicosData as Servico[]) ||
          [],

        agendamentos:
          agendamentosNormalizados,
      });
    } catch (erro) {
      console.error(
        "Erro geral no Dashboard:",
        erro
      );

      setMensagem(
        "Ocorreu um erro ao carregar o Dashboard."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  /*
   * ==========================
   * LOGOUT
   * ==========================
   */

  async function sair() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
  }

  /*
   * ==========================
   * AGENDAMENTOS DE HOJE
   * ==========================
   */

  const agendamentosHoje =
    dados.agendamentos.filter(
      (agendamento) => {
        const data = new Date(
          agendamento.data_hora
        );

        return mesmoDia(
          data,
          hoje
        );
      }
    );

  /*
   * ==========================
   * AGENDAMENTOS DO MÊS
   * ==========================
   */

  const agendamentosMes =
    dados.agendamentos.filter(
      (agendamento) => {
        const data = new Date(
          agendamento.data_hora
        );

        return (
          data >= inicioMes &&
          !estaCancelado(
            agendamento.status
          )
        );
      }
    );

  /*
   * ==========================
   * FATURAMENTO HOJE
   * ==========================
   */

  const faturamentoHoje =
    agendamentosHoje
      .filter(
        (agendamento) =>
          estaConcluido(
            agendamento.status
          )
      )
      .reduce(
        (
          total,
          agendamento
        ) =>
          total +
          Number(
            agendamento.servico
              ?.preco || 0
          ),
        0
      );

  /*
   * ==========================
   * FATURAMENTO DO MÊS
   * ==========================
   */

  const faturamentoMes =
    agendamentosMes
      .filter(
        (agendamento) =>
          estaConcluido(
            agendamento.status
          )
      )
      .reduce(
        (
          total,
          agendamento
        ) =>
          total +
          Number(
            agendamento.servico
              ?.preco || 0
          ),
        0
      );

  /*
   * ==========================
   * ATENDIMENTOS CONCLUÍDOS
   * ==========================
   */

  const atendimentosConcluidosMes =
    agendamentosMes.filter(
      (agendamento) =>
        estaConcluido(
          agendamento.status
        )
    ).length;

  /*
   * ==========================
   * TICKET MÉDIO
   * ==========================
   */

  const ticketMedio =
    atendimentosConcluidosMes >
    0
      ? faturamentoMes /
        atendimentosConcluidosMes
      : 0;

  /*
   * ==========================
   * PRÓXIMOS AGENDAMENTOS
   * ==========================
   */

  const proximosAgendamentos =
    dados.agendamentos
      .filter(
        (agendamento) => {
          const data =
            new Date(
              agendamento.data_hora
            );

          return (
            data >= new Date() &&
            !estaCancelado(
              agendamento.status
            )
          );
        }
      )
      .sort(
        (a, b) =>
          new Date(
            a.data_hora
          ).getTime() -
          new Date(
            b.data_hora
          ).getTime()
      )
      .slice(0, 6);

  /*
   * ==========================
   * GRÁFICO DOS ÚLTIMOS 7 DIAS
   * ==========================
   */

  const ultimos7Dias =
    Array.from(
      { length: 7 },
      (_, indice) => {
        const data =
          new Date();

        data.setDate(
          data.getDate() -
            (6 - indice)
        );

        data.setHours(
          0,
          0,
          0,
          0
        );

        const proximoDia =
          new Date(data);

        proximoDia.setDate(
          proximoDia.getDate() +
            1
        );

        const faturamento =
          dados.agendamentos
            .filter(
              (agendamento) => {
                const dataAgendamento =
                  new Date(
                    agendamento.data_hora
                  );

                return (
                  dataAgendamento >=
                    data &&
                  dataAgendamento <
                    proximoDia &&
                  estaConcluido(
                    agendamento.status
                  )
                );
              }
            )
            .reduce(
              (
                total,
                agendamento
              ) =>
                total +
                Number(
                  agendamento
                    .servico
                    ?.preco || 0
                ),
              0
            );

        return {
          data,
          faturamento,
        };
      }
    );

  const maiorFaturamento =
    Math.max(
      ...ultimos7Dias.map(
        (dia) =>
          dia.faturamento
      ),
      1
    );

  /*
   * ==========================
   * RANKING DE SERVIÇOS
   * ==========================
   */

  const rankingServicos =
    useMemo(() => {
      const mapa =
        new Map<
          string,
          {
            nome: string;
            quantidade: number;
            faturamento: number;
          }
        >();

      agendamentosMes
        .filter(
          (agendamento) =>
            estaConcluido(
              agendamento.status
            )
        )
        .forEach(
          (agendamento) => {
            const nome =
              agendamento.servico
                ?.nome ||
              "Serviço";

            const atual =
              mapa.get(nome) || {
                nome,
                quantidade: 0,
                faturamento: 0,
              };

            atual.quantidade += 1;

            atual.faturamento +=
              Number(
                agendamento.servico
                  ?.preco || 0
              );

            mapa.set(
              nome,
              atual
            );
          }
        );

      return Array.from(
        mapa.values()
      )
        .sort(
          (a, b) =>
            b.quantidade -
            a.quantidade
        )
        .slice(0, 5);
    }, [
      agendamentosMes,
    ]);

  const maiorQuantidadeServico =
    Math.max(
      ...rankingServicos.map(
        (servico) =>
          servico.quantidade
      ),
      1
    );

  /*
   * ==========================
   * STATUS
   * ==========================
   */

  function textoStatus(
    status: string | null
  ) {
    const valor =
      statusNormalizado(status);

    if (
      valor === "confirmado"
    ) {
      return "Confirmado";
    }

    if (
      valor === "concluido" ||
      valor === "concluida" ||
      valor === "finalizado" ||
      valor === "finalizada"
    ) {
      return "Concluído";
    }

    if (
      valor === "cancelado" ||
      valor === "cancelada"
    ) {
      return "Cancelado";
    }

    return "Agendado";
  }

  function classeStatus(
    status: string | null
  ) {
    const valor =
      statusNormalizado(status);

    if (
      valor === "confirmado"
    ) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    if (
      valor === "concluido" ||
      valor === "concluida" ||
      valor === "finalizado" ||
      valor === "finalizada"
    ) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }

    if (
      valor === "cancelado" ||
      valor === "cancelada"
    ) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  /*
   * ==========================
   * LOADING
   * ==========================
   */

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">

        <div className="lg:pl-72 min-h-screen flex items-center justify-center">

          <div className="text-center">

            <div className="
              w-10
              h-10
              border-2
              border-zinc-700
              border-t-white
              rounded-full
              animate-spin
              mx-auto
              mb-4
            " />

            <p className="text-zinc-400">
              Carregando seu dashboard...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /*
   * ==========================
   * DASHBOARD
   * ==========================
   */

  return (
  <main className="min-h-screen bg-zinc-950 text-white">

    <div className="min-h-screen">

      {/* HEADER */}

      ...
        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <header className="
          sticky
          top-0
          z-30
          border-b
          border-zinc-800
          bg-zinc-950/90
          backdrop-blur
        ">

          <div className="
            max-w-[1600px]
            mx-auto
            px-4
            sm:px-6
            py-4
            flex
            items-center
            justify-between
            gap-4
          ">

            <div className="pl-14 lg:pl-0">

              <p className="text-xs text-zinc-600 uppercase tracking-wider">
                Painel administrativo
              </p>

              <h1 className="text-lg sm:text-xl font-bold mt-1">
                Dashboard
              </h1>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  carregarDashboard(true)
                }
                disabled={atualizando}
                className="
                  hidden
                  sm:flex
                  items-center
                  gap-2
                  border
                  border-zinc-800
                  px-4
                  py-2
                  rounded-lg
                  text-sm
                  text-zinc-400
                  hover:text-white
                  hover:bg-zinc-900
                  transition
                  disabled:opacity-50
                "
              >
                <span
                  className={
                    atualizando
                      ? "animate-spin"
                      : ""
                  }
                >
                  ↻
                </span>

                Atualizar
              </button>

            </div>

          </div>

        </header>

        {/* ================================= */}
        {/* CONTEÚDO */}
        {/* ================================= */}

        <section className="
          max-w-[1600px]
          mx-auto
          px-4
          sm:px-6
          py-6
          sm:py-8
        ">

          {/* ================================= */}
          {/* SAUDAÇÃO */}
          {/* ================================= */}

          <div className="mb-8">

            <p className="text-sm text-zinc-500 mb-2">
              {new Date().toLocaleDateString(
                "pt-BR",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              )}
            </p>

            <h2 className="
              text-2xl
              sm:text-3xl
              font-bold
            ">
              Olá,{" "}
              {dados.usuarioNome}
              👋
            </h2>

            <p className="text-zinc-500 mt-2">
              Aqui está um resumo da sua
              barbearia.
            </p>

          </div>

          {/* ================================= */}
          {/* MENSAGEM */}
          {/* ================================= */}

          {mensagem && (
            <div className="
              mb-6
              rounded-xl
              border
              border-amber-500/20
              bg-amber-500/5
              text-amber-400
              px-4
              py-3
              text-sm
            ">
              {mensagem}
            </div>
          )}

          {/* ================================= */}
          {/* CARDS PRINCIPAIS */}
          {/* ================================= */}

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4
            gap-4
            mb-6
          ">

            {/* AGENDAMENTOS */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/agenda"
                )
              }
              className="
                text-left
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-5
                hover:border-zinc-700
                hover:bg-zinc-900/80
                transition
              "
            >

              <div className="
                flex
                items-start
                justify-between
                gap-4
              ">

                <div>

                  <p className="text-sm text-zinc-500">
                    Agendamentos hoje
                  </p>

                  <p className="
                    text-3xl
                    font-bold
                    mt-2
                  ">
                    {agendamentosHoje.length}
                  </p>

                </div>

                <div className="
                  w-11
                  h-11
                  rounded-xl
                  bg-blue-500/10
                  text-blue-400
                  flex
                  items-center
                  justify-center
                  text-lg
                ">
                  📅
                </div>

              </div>

              <p className="
                text-xs
                text-zinc-600
                mt-4
              ">
                Abrir agenda →
              </p>

            </button>

            {/* CLIENTES */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/clientes"
                )
              }
              className="
                text-left
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-5
                hover:border-zinc-700
                hover:bg-zinc-900/80
                transition
              "
            >

              <div className="
                flex
                items-start
                justify-between
                gap-4
              ">

                <div>

                  <p className="text-sm text-zinc-500">
                    Clientes
                  </p>

                  <p className="
                    text-3xl
                    font-bold
                    mt-2
                  ">
                    {dados.clientes.length}
                  </p>

                </div>

                <div className="
                  w-11
                  h-11
                  rounded-xl
                  bg-purple-500/10
                  text-purple-400
                  flex
                  items-center
                  justify-center
                  text-lg
                ">
                  👥
                </div>

              </div>

              <p className="
                text-xs
                text-zinc-600
                mt-4
              ">
                Ver clientes →
              </p>

            </button>

            {/* SERVIÇOS */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/servicos"
                )
              }
              className="
                text-left
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-5
                hover:border-zinc-700
                hover:bg-zinc-900/80
                transition
              "
            >

              <div className="
                flex
                items-start
                justify-between
                gap-4
              ">

                <div>

                  <p className="text-sm text-zinc-500">
                    Serviços
                  </p>

                  <p className="
                    text-3xl
                    font-bold
                    mt-2
                  ">
                    {dados.servicos.length}
                  </p>

                </div>

                <div className="
                  w-11
                  h-11
                  rounded-xl
                  bg-orange-500/10
                  text-orange-400
                  flex
                  items-center
                  justify-center
                  text-lg
                ">
                  ✂️
                </div>

              </div>

              <p className="
                text-xs
                text-zinc-600
                mt-4
              ">
                Ver serviços →
              </p>

            </button>

            {/* FATURAMENTO */}

            <div className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-5
            ">

              <div className="
                flex
                items-start
                justify-between
                gap-4
              ">

                <div>

                  <p className="text-sm text-zinc-500">
                    Faturamento hoje
                  </p>

                  <p className="
                    text-2xl
                    sm:text-3xl
                    font-bold
                    mt-2
                  ">
                    {formatarMoeda(
                      faturamentoHoje
                    )}
                  </p>

                </div>

                <div className="
                  w-11
                  h-11
                  rounded-xl
                  bg-emerald-500/10
                  text-emerald-400
                  flex
                  items-center
                  justify-center
                  text-lg
                ">
                  $
                </div>

              </div>

              <p className="
                text-xs
                text-zinc-600
                mt-4
              ">
                Atendimentos concluídos
              </p>

            </div>

          </div>

          {/* ================================= */}
          {/* MÉTRICAS DO MÊS */}
          {/* ================================= */}

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-3
            gap-4
            mb-8
          ">

            <div className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-5
            ">

              <p className="text-sm text-zinc-500">
                Faturamento do mês
              </p>

              <p className="
                text-2xl
                font-bold
                mt-2
              ">
                {formatarMoeda(
                  faturamentoMes
                )}
              </p>

              <p className="
                text-xs
                text-zinc-600
                mt-2
              ">
                Serviços concluídos
              </p>

            </div>

            <div className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-5
            ">

              <p className="text-sm text-zinc-500">
                Atendimentos concluídos
              </p>

              <p className="
                text-2xl
                font-bold
                mt-2
              ">
                {atendimentosConcluidosMes}
              </p>

              <p className="
                text-xs
                text-zinc-600
                mt-2
              ">
                Neste mês
              </p>

            </div>

            <div className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-5
            ">

              <p className="text-sm text-zinc-500">
                Ticket médio
              </p>

              <p className="
                text-2xl
                font-bold
                mt-2
              ">
                {formatarMoeda(
                  ticketMedio
                )}
              </p>

              <p className="
                text-xs
                text-zinc-600
                mt-2
              ">
                Média por atendimento
              </p>

            </div>

          </div>

          {/* ================================= */}
          {/* GRÁFICO + PRÓXIMOS */}
          {/* ================================= */}

          <div className="
            grid
            grid-cols-1
            xl:grid-cols-3
            gap-6
          ">

            {/* ================================= */}
            {/* GRÁFICO */}
            {/* ================================= */}

            <section className="
              xl:col-span-2
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-5
              sm:p-6
            ">

              <div className="
                flex
                items-center
                justify-between
                gap-4
                mb-8
              ">

                <div>

                  <h3 className="
                    text-lg
                    font-semibold
                  ">
                    Faturamento
                  </h3>

                  <p className="
                    text-sm
                    text-zinc-500
                    mt-1
                  ">
                    Últimos 7 dias
                  </p>

                </div>

                <div className="text-right">

                  <p className="
                    text-xs
                    text-zinc-600
                  ">
                    Total
                  </p>

                  <p className="
                    text-sm
                    font-semibold
                    mt-1
                  ">
                    {formatarMoeda(
                      ultimos7Dias.reduce(
                        (
                          total,
                          dia
                        ) =>
                          total +
                          dia.faturamento,
                        0
                      )
                    )}
                  </p>

                </div>

              </div>

              <div className="
                h-64
                flex
                items-end
                gap-2
                sm:gap-4
              ">

                {ultimos7Dias.map(
                  (
                    dia,
                    indice
                  ) => {

                    const altura =
                      dia.faturamento ===
                      0
                        ? 4
                        : Math.max(
                            8,
                            (
                              dia.faturamento /
                              maiorFaturamento
                            ) *
                              100
                          );

                    const ehHoje =
                      mesmoDia(
                        dia.data,
                        hoje
                      );

                    return (
                      <div
                        key={indice}
                        className="
                          flex-1
                          h-full
                          flex
                          flex-col
                          justify-end
                          items-center
                          gap-2
                        "
                      >

                        <div className="
                          w-full
                          flex
                          justify-center
                          h-full
                          items-end
                        ">

                          <div
                            className={`
                              w-full
                              max-w-12
                              rounded-t-lg
                              transition-all
                              ${
                                ehHoje
                                  ? "bg-white"
                                  : "bg-zinc-700"
                              }
                            `}
                            style={{
                              height:
                                `${altura}%`,
                              minHeight:
                                "4px",
                            }}
                            title={formatarMoeda(
                              dia.faturamento
                            )}
                          />

                        </div>

                        <div className="text-center">

                          <p className="
                            text-[10px]
                            sm:text-xs
                            text-zinc-500
                            capitalize
                          ">
                            {formatarDiaSemana(
                              dia.data
                            )}
                          </p>

                          <p className="
                            text-[9px]
                            text-zinc-700
                            mt-1
                          ">
                            {dia.data.getDate()}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* ================================= */}
            {/* PRÓXIMOS AGENDAMENTOS */}
            {/* ================================= */}

            <section className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              overflow-hidden
            ">

              <div className="
                p-5
                sm:p-6
                border-b
                border-zinc-800
                flex
                items-center
                justify-between
                gap-4
              ">

                <div>

                  <h3 className="
                    text-lg
                    font-semibold
                  ">
                    Próximos horários
                  </h3>

                  <p className="
                    text-sm
                    text-zinc-500
                    mt-1
                  ">
                    Próximos atendimentos
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/agenda"
                    )
                  }
                  className="
                    text-xs
                    text-zinc-500
                    hover:text-white
                    transition
                  "
                >
                  Ver tudo →
                </button>

              </div>

              {proximosAgendamentos.length ===
              0 ? (

                <div className="
                  p-8
                  text-center
                ">

                  <div className="
                    text-3xl
                    mb-3
                  ">
                    📅
                  </div>

                  <p className="
                    text-sm
                    text-zinc-500
                  ">
                    Nenhum próximo agendamento.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/dashboard/agenda"
                      )
                    }
                    className="
                      mt-4
                      bg-white
                      text-black
                      px-4
                      py-2
                      rounded-lg
                      text-sm
                      font-semibold
                      hover:bg-zinc-200
                      transition
                    "
                  >
                    Abrir agenda
                  </button>

                </div>

              ) : (

                <div className="
                  divide-y
                  divide-zinc-800
                ">

                  {proximosAgendamentos.map(
                    (
                      agendamento
                    ) => {

                      const data =
                        new Date(
                          agendamento.data_hora
                        );

                      const ehHoje =
                        mesmoDia(
                          data,
                          hoje
                        );

                      return (
                        <button
                          key={
                            agendamento.id
                          }
                          type="button"
                          onClick={() =>
                            router.push(
                              "/dashboard/agenda"
                            )
                          }
                          className="
                            w-full
                            text-left
                            p-4
                            hover:bg-zinc-800/50
                            transition
                          "
                        >

                          <div className="
                            flex
                            items-center
                            gap-3
                          ">

                            <div className="
                              w-12
                              h-12
                              rounded-xl
                              bg-zinc-800
                              flex
                              flex-col
                              items-center
                              justify-center
                              shrink-0
                            ">

                              <span className="
                                text-sm
                                font-bold
                              ">
                                {formatarHora(
                                  agendamento.data_hora
                                )}
                              </span>

                            </div>

                            <div className="
                              min-w-0
                              flex-1
                            ">

                              <div className="
                                flex
                                items-center
                                justify-between
                                gap-2
                              ">

                                <p className="
                                  font-medium
                                  truncate
                                ">
                                  {agendamento.cliente
                                    ?.nome ||
                                    "Cliente"}
                                </p>

                                <span
                                  className={`
                                    shrink-0
                                    text-[9px]
                                    px-2
                                    py-1
                                    rounded-full
                                    border
                                    ${classeStatus(
                                      agendamento.status
                                    )}
                                  `}
                                >
                                  {textoStatus(
                                    agendamento.status
                                  )}
                                </span>

                              </div>

                              <p className="
                                text-xs
                                text-zinc-500
                                mt-1
                                truncate
                              ">
                                {agendamento.servico
                                  ?.nome ||
                                  "Serviço"}
                              </p>

                              <p className="
                                text-[11px]
                                text-zinc-600
                                mt-1
                              ">
                                {ehHoje
                                  ? "Hoje"
                                  : formatarData(
                                      agendamento.data_hora
                                    )}
                              </p>

                            </div>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              )}

            </section>

          </div>

          {/* ================================= */}
          {/* SERVIÇOS + AÇÕES */}
          {/* ================================= */}

          <div className="
            grid
            grid-cols-1
            lg:grid-cols-2
            gap-6
            mt-6
          ">

            {/* SERVIÇOS */}

            <section className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              overflow-hidden
            ">

              <div className="
                p-5
                sm:p-6
                border-b
                border-zinc-800
              ">

                <h3 className="
                  text-lg
                  font-semibold
                ">
                  Serviços mais realizados
                </h3>

                <p className="
                  text-sm
                  text-zinc-500
                  mt-1
                ">
                  Desempenho deste mês
                </p>

              </div>

              {rankingServicos.length ===
              0 ? (

                <div className="
                  p-10
                  text-center
                ">

                  <div className="
                    text-3xl
                    mb-3
                  ">
                    ✂️
                  </div>

                  <p className="
                    text-sm
                    text-zinc-500
                  ">
                    Ainda não há atendimentos
                    concluídos neste mês.
                  </p>

                </div>

              ) : (

                <div className="
                  p-5
                  space-y-5
                ">

                  {rankingServicos.map(
                    (
                      servico,
                      indice
                    ) => {

                      const largura =
                        (
                          servico.quantidade /
                          maiorQuantidadeServico
                        ) *
                        100;

                      return (
                        <div
                          key={
                            servico.nome
                          }
                        >

                          <div className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            mb-2
                          ">

                            <div className="
                              flex
                              items-center
                              gap-3
                              min-w-0
                            ">

                              <div className="
                                w-8
                                h-8
                                rounded-lg
                                bg-zinc-800
                                flex
                                items-center
                                justify-center
                                text-xs
                                font-bold
                                text-zinc-400
                              ">
                                {indice + 1}
                              </div>

                              <p className="
                                text-sm
                                font-medium
                                truncate
                              ">
                                {servico.nome}
                              </p>

                            </div>

                            <div className="
                              text-right
                              shrink-0
                            ">

                              <p className="
                                text-sm
                                font-semibold
                              ">
                                {servico.quantidade}x
                              </p>

                              <p className="
                                text-[11px]
                                text-zinc-600
                              ">
                                {formatarMoeda(
                                  servico.faturamento
                                )}
                              </p>

                            </div>

                          </div>

                          <div className="
                            h-2
                            bg-zinc-800
                            rounded-full
                            overflow-hidden
                          ">

                            <div
                              className="
                                h-full
                                bg-white
                                rounded-full
                                transition-all
                              "
                              style={{
                                width:
                                  `${largura}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </section>

            {/* AÇÕES RÁPIDAS */}

            <section className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              overflow-hidden
            ">

              <div className="
                p-5
                sm:p-6
                border-b
                border-zinc-800
              ">

                <h3 className="
                  text-lg
                  font-semibold
                ">
                  Ações rápidas
                </h3>

                <p className="
                  text-sm
                  text-zinc-500
                  mt-1
                ">
                  Acesse as principais funções
                </p>

              </div>

              <div className="
                p-5
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-3
              ">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/agenda"
                    )
                  }
                  className="
                    border
                    border-zinc-800
                    rounded-xl
                    p-4
                    text-left
                    hover:bg-zinc-800/60
                    hover:border-zinc-700
                    transition
                  "
                >

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      w-10
                      h-10
                      rounded-lg
                      bg-blue-500/10
                      text-blue-400
                      flex
                      items-center
                      justify-center
                    ">
                      📅
                    </div>

                    <div>

                      <p className="
                        font-medium
                      ">
                        Agenda
                      </p>

                      <p className="
                        text-xs
                        text-zinc-600
                        mt-1
                      ">
                        Gerenciar horários
                      </p>

                    </div>

                  </div>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/clientes"
                    )
                  }
                  className="
                    border
                    border-zinc-800
                    rounded-xl
                    p-4
                    text-left
                    hover:bg-zinc-800/60
                    hover:border-zinc-700
                    transition
                  "
                >

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      w-10
                      h-10
                      rounded-lg
                      bg-purple-500/10
                      text-purple-400
                      flex
                      items-center
                      justify-center
                    ">
                      👥
                    </div>

                    <div>

                      <p className="
                        font-medium
                      ">
                        Clientes
                      </p>

                      <p className="
                        text-xs
                        text-zinc-600
                        mt-1
                      ">
                        Ver fichas
                      </p>

                    </div>

                  </div>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/servicos"
                    )
                  }
                  className="
                    border
                    border-zinc-800
                    rounded-xl
                    p-4
                    text-left
                    hover:bg-zinc-800/60
                    hover:border-zinc-700
                    transition
                  "
                >

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      w-10
                      h-10
                      rounded-lg
                      bg-orange-500/10
                      text-orange-400
                      flex
                      items-center
                      justify-center
                    ">
                      ✂️
                    </div>

                    <div>

                      <p className="
                        font-medium
                      ">
                        Serviços
                      </p>

                      <p className="
                        text-xs
                        text-zinc-600
                        mt-1
                      ">
                        Gerenciar serviços
                      </p>

                    </div>

                  </div>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/agenda"
                    )
                  }
                  className="
                    border
                    border-zinc-800
                    rounded-xl
                    p-4
                    text-left
                    hover:bg-zinc-800/60
                    hover:border-zinc-700
                    transition
                  "
                >

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      w-10
                      h-10
                      rounded-lg
                      bg-emerald-500/10
                      text-emerald-400
                      flex
                      items-center
                      justify-center
                    ">
                      +
                    </div>

                    <div>

                      <p className="
                        font-medium
                      ">
                        Novo agendamento
                      </p>

                      <p className="
                        text-xs
                        text-zinc-600
                        mt-1
                      ">
                        Marcar atendimento
                      </p>

                    </div>

                  </div>

                </button>

              </div>

            </section>

          </div>

          {/* ================================= */}
          {/* RESUMO DE HOJE */}
          {/* ================================= */}

          <section className="
            mt-6
            bg-zinc-900
            border
            border-zinc-800
            rounded-2xl
            p-5
            sm:p-6
          ">

            <div className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-4
            ">

              <div>

                <h3 className="
                  text-lg
                  font-semibold
                ">
                  Resumo de hoje
                </h3>

                <p className="
                  text-sm
                  text-zinc-500
                  mt-1
                  capitalize
                ">
                  {new Date().toLocaleDateString(
                    "pt-BR",
                    {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }
                  )}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard/agenda"
                  )
                }
                className="
                  bg-white
                  text-black
                  px-4
                  py-2
                  rounded-lg
                  text-sm
                  font-semibold
                  hover:bg-zinc-200
                  transition
                "
              >
                Abrir agenda
              </button>

            </div>

            <div className="
              grid
              grid-cols-2
              md:grid-cols-4
              gap-3
              sm:gap-4
              mt-6
            ">

              <div className="
                bg-zinc-950
                rounded-xl
                p-4
              ">

                <p className="
                  text-xs
                  text-zinc-600
                ">
                  Agendados
                </p>

                <p className="
                  text-xl
                  font-bold
                  mt-1
                ">
                  {
                    agendamentosHoje.filter(
                      (agendamento) =>
                        !estaCancelado(
                          agendamento.status
                        )
                    ).length
                  }
                </p>

              </div>

              <div className="
                bg-zinc-950
                rounded-xl
                p-4
              ">

                <p className="
                  text-xs
                  text-zinc-600
                ">
                  Concluídos
                </p>

                <p className="
                  text-xl
                  font-bold
                  mt-1
                ">
                  {
                    agendamentosHoje.filter(
                      (agendamento) =>
                        estaConcluido(
                          agendamento.status
                        )
                    ).length
                  }
                </p>

              </div>

              <div className="
                bg-zinc-950
                rounded-xl
                p-4
              ">

                <p className="
                  text-xs
                  text-zinc-600
                ">
                  Cancelados
                </p>

                <p className="
                  text-xl
                  font-bold
                  mt-1
                ">
                  {
                    agendamentosHoje.filter(
                      (agendamento) =>
                        estaCancelado(
                          agendamento.status
                        )
                    ).length
                  }
                </p>

              </div>

              <div className="
                bg-zinc-950
                rounded-xl
                p-4
              ">

                <p className="
                  text-xs
                  text-zinc-600
                ">
                  Faturamento
                </p>

                <p className="
                  text-lg
                  sm:text-xl
                  font-bold
                  mt-1
                ">
                  {formatarMoeda(
                    faturamentoHoje
                  )}
                </p>

              </div>

            </div>

          </section>

        </section>

        {/* ================================= */}
        {/* FOOTER */}
        {/* ================================= */}

        <footer className="
          border-t
          border-zinc-900
          mt-8
        ">

          <div className="
            max-w-[1600px]
            mx-auto
            px-4
            sm:px-6
            py-6
            flex
            flex-col
            sm:flex-row
            items-center
            justify-between
            gap-2
          ">

            <p className="
              text-xs
              text-zinc-700
            ">
              Barber System
            </p>

            <p className="
              text-xs
              text-zinc-700
            ">
              Gestão inteligente para sua barbearia
            </p>

          </div>

        </footer>

      </div>

    </main>
  );
}