"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
};

type Servico = {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
};

type AgendamentoServico = {
  id: string;
  agendamento_id: string;
  servico_id: string;
  servico?: Servico | null;
};

type AssinaturaPlano = {
  id: string;
  plano_id: string;
  plano_nome: string;
  data_vencimento: string | null;
  status: string;
  servicos: {
    servico_id: string;
    quantidade: number;
    usado: number;
    restante: number;
  }[];
};

type Agendamento = {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  cliente_id: string;
  servico_id: string | null;

  cliente?: Cliente | null;

  servico?: Servico | null;

  agendamento_servicos?: AgendamentoServico[];
  origem?: string | null;
  assinatura_plano_id?: string | null;
  plano_id?: string | null;
};

const HORA_INICIAL = 8;
const HORA_FINAL = 22;
const ALTURA_HORA = 80;

export default function Agenda() {
  const router = useRouter();

  const [barbeariaId, setBarbeariaId] = useState("");
  const [barbeariaNome, setBarbeariaNome] = useState("");
const [whatsappBarbearia, setWhatsappBarbearia] = useState("");
const [mensagemConfirmacao, setMensagemConfirmacao] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [semanaAtual, setSemanaAtual] = useState(
    obterInicioDaSemana(new Date())
  );

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarFicha, setMostrarFicha] = useState(false);

  const [agendamentoSelecionado, setAgendamentoSelecionado] =
    useState<Agendamento | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState<"avulso" | "plano">("avulso");
  const [assinaturasPlano, setAssinaturasPlano] = useState<AssinaturaPlano[]>([]);
  const [assinaturaPlanoId, setAssinaturaPlanoId] = useState("");
  const [carregandoPlanosCliente, setCarregandoPlanosCliente] = useState(false);

  const [servicosSelecionados, setServicosSelecionados] =
    useState<string[]>([]);

  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [agendamentoArrastado, setAgendamentoArrastado] =
    useState<Agendamento | null>(null);

  const [arrasteDestino, setArrasteDestino] = useState<{
    data: string;
    hora: number;
    minuto: number;
  } | null>(null);

  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAgora(new Date());
    }, 60000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  function obterInicioDaSemana(dataBase: Date) {
    const data = new Date(dataBase);

    const dia = data.getDay();
    const diferenca = dia === 0 ? -6 : 1 - dia;

    data.setDate(data.getDate() + diferenca);
    data.setHours(0, 0, 0, 0);

    return data;
  }

  function obterDataString(dataBase: Date) {
    const ano = dataBase.getFullYear();
    const mes = String(dataBase.getMonth() + 1).padStart(2, "0");
    const dia = String(dataBase.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  const diasDaSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, indice) => {
      const data = new Date(semanaAtual);
      data.setDate(data.getDate() + indice);
      return data;
    });
  }, [semanaAtual]);

  const horas = Array.from(
    {
      length: HORA_FINAL - HORA_INICIAL + 1,
    },
    (_, indice) => HORA_INICIAL + indice
  );

  const totalSemana = agendamentos.filter(
    (agendamento) => agendamento.status !== "cancelado"
  ).length;

  const totalHoje = agendamentos.filter((agendamento) => {
    return (
      ehHoje(new Date(agendamento.data_hora)) &&
      agendamento.status !== "cancelado"
    );
  }).length;

  const totalConfirmados = agendamentos.filter(
    (agendamento) => agendamento.status === "confirmado"
  ).length;

  const totalConcluidos = agendamentos.filter(
    (agendamento) => agendamento.status === "concluido"
  ).length;

  /*
   * SERVIÇOS SELECIONADOS
   */

  const servicosDoFormulario = servicos.filter((servico) =>
    servicosSelecionados.includes(servico.id)
  );

  const duracaoTotalFormulario = servicosDoFormulario.reduce(
    (total, servico) =>
      total + Number(servico.duracao_minutos),
    0
  );

  const precoTotalFormulario = servicosDoFormulario.reduce(
    (total, servico) =>
      total + Number(servico.preco),
    0
  );

  function alternarServico(servicoId: string) {
    setServicosSelecionados((atual) => {
      if (atual.includes(servicoId)) {
        return atual.filter((id) => id !== servicoId);
      }

      return [...atual, servicoId];
    });
  }

  function obterServicosDoAgendamento(
    agendamento: Agendamento
  ): Servico[] {
    if (
      agendamento.agendamento_servicos &&
      agendamento.agendamento_servicos.length > 0
    ) {
      return agendamento.agendamento_servicos
        .map((item) => item.servico)
        .filter(
          (servico): servico is Servico =>
            Boolean(servico)
        );
    }

    if (agendamento.servico) {
      return [agendamento.servico];
    }

    return [];
  }

  function obterDuracaoAgendamento(
    agendamento: Agendamento
  ) {
    const lista = obterServicosDoAgendamento(
      agendamento
    );

    if (lista.length === 0) {
      return 30;
    }

    return lista.reduce(
      (total, servico) =>
        total + Number(servico.duracao_minutos),
      0
    );
  }

  function obterPrecoAgendamento(
    agendamento: Agendamento
  ) {
    const lista = obterServicosDoAgendamento(
      agendamento
    );

    return lista.reduce(
      (total, servico) =>
        total + Number(servico.preco),
      0
    );
  }

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (barbeariaId) {
      carregarAgendamentos();
    }
  }, [barbeariaId, semanaAtual]);

  async function carregarDados() {
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
  console.error(
    "ERRO AO BUSCAR BARBEARIA:",
    erroBarbearia
  );

  return;
}

setBarbeariaId(barbearia.id);

    setBarbeariaId(barbearia.id);
    setBarbeariaNome(barbearia.nome || "");
setWhatsappBarbearia(barbearia.whatsapp || "");
setMensagemConfirmacao(
  barbearia.mensagem_confirmacao || ""
);

    const { data: clientesData, error: clientesError } =
      await supabase
        .from("clientes")
        .select("id, nome, telefone, email")
        .eq("barbearia_id", barbearia.id)
        .order("nome", { ascending: true });

    if (clientesError) {
      console.error(
        "ERRO AO BUSCAR CLIENTES:",
        JSON.stringify(clientesError, null, 2)
      );
    } else {
      setClientes(clientesData ?? []);
    }

    const { data: servicosData, error: servicosError } =
      await supabase
        .from("servicos")
        .select(
          "id, nome, preco, duracao_minutos"
        )
        .eq("barbearia_id", barbearia.id)
        .eq("ativo", true)
        .order("nome", { ascending: true });

    if (servicosError) {
      console.error(
        "ERRO AO BUSCAR SERVIÇOS:",
        JSON.stringify(servicosError, null, 2)
      );
    } else {
      setServicos(servicosData ?? []);
    }
  }

  async function carregarAgendamentos() {
    const inicio = new Date(semanaAtual);

    const fim = new Date(semanaAtual);
    fim.setDate(fim.getDate() + 7);

    const supabase = createClient();

    const { data: agendamentosData, error } = await supabase
      .from("agendamentos")
      .select(
        "id, data_hora, status, observacoes, cliente_id, servico_id, origem, assinatura_plano_id, plano_id"
      )
      .eq("barbearia_id", barbeariaId)
      .gte("data_hora", inicio.toISOString())
      .lt("data_hora", fim.toISOString())
      .order("data_hora", {
        ascending: true,
      });

    if (error) {
      const erroCompleto = JSON.stringify(
        error,
        null,
        2
      );

      console.error(
        "ERRO AO CARREGAR AGENDAMENTOS:",
        erroCompleto
      );

      alert(
        `ERRO AO CARREGAR AGENDAMENTOS:\n\n${erroCompleto}`
      );

      return;
    }

    const listaAgendamentos = agendamentosData ?? [];

    if (listaAgendamentos.length === 0) {
      setAgendamentos([]);
      return;
    }

    const idsClientes = [
      ...new Set(
        listaAgendamentos.map(
          (item) => item.cliente_id
        )
      ),
    ];

    const idsServicosAntigos = [
      ...new Set(
        listaAgendamentos
          .map((item) => item.servico_id)
          .filter(
            (id): id is string =>
              Boolean(id)
          )
      ),
    ];

    const { data: clientesData } =
      await supabase
        .from("clientes")
        .select(
          "id, nome, telefone, email"
        )
        .in("id", idsClientes);

    /*
     * BUSCA SERVIÇOS DOS AGENDAMENTOS
     */

    const idsAgendamentos =
      listaAgendamentos.map(
        (item) => item.id
      );

    const {
      data: agendamentoServicosData,
      error: agendamentoServicosError,
    } = await supabase
      .from("agendamento_servicos")
      .select(
        `
          id,
          agendamento_id,
          servico_id
        `
      )
      .in(
        "agendamento_id",
        idsAgendamentos
      );

    if (agendamentoServicosError) {
      console.error(
        "ERRO AO BUSCAR SERVIÇOS DOS AGENDAMENTOS:",
        JSON.stringify(
          agendamentoServicosError,
          null,
          2
        )
      );
    }

    const idsServicosRelacionados = [
      ...new Set(
        (agendamentoServicosData ?? []).map(
          (item) => item.servico_id
        )
      ),
    ];

    const idsServicos = [
      ...new Set([
        ...idsServicosAntigos,
        ...idsServicosRelacionados,
      ]),
    ];

    let servicosData: Servico[] = [];

if (idsServicos.length > 0) {
  const {
    data,
    error: servicosError,
  } = await supabase
    .from("servicos")
    .select(
      "id, nome, preco, duracao_minutos"
    )
    .in("id", idsServicos);

  if (servicosError) {
    console.error(
      "ERRO AO BUSCAR SERVIÇOS DOS AGENDAMENTOS:",
      JSON.stringify(
        servicosError,
        null,
        2
      )
    );
  } else {
    servicosData = data ?? [];
  }
}

    const clientesMap = new Map(
      (clientesData ?? []).map(
        (cliente) => [
          cliente.id,
          cliente,
        ]
      )
    );

    const servicosMap = new Map(
      (servicosData ?? []).map(
        (servico) => [
          servico.id,
          servico,
        ]
      )
    );

    const relacoesMap = new Map<
      string,
      AgendamentoServico[]
    >();

    (
      agendamentoServicosData ?? []
    ).forEach((item) => {
      const lista =
        relacoesMap.get(
          item.agendamento_id
        ) ?? [];

      lista.push({
        ...item,
        servico:
          servicosMap.get(
            item.servico_id
          ) ?? null,
      });

      relacoesMap.set(
        item.agendamento_id,
        lista
      );
    });

    const agendaCompleta: Agendamento[] =
      listaAgendamentos.map(
        (agendamento) => ({
          ...agendamento,

          cliente:
            clientesMap.get(
              agendamento.cliente_id
            ) ?? null,

          servico:
            agendamento.servico_id
              ? servicosMap.get(
                  agendamento.servico_id
                ) ?? null
              : null,

          agendamento_servicos:
            relacoesMap.get(
              agendamento.id
            ) ?? [],
        })
      );

    setAgendamentos(
      agendaCompleta
    );
  }

  function abrirNovoAgendamento(
    dataSelecionada?: Date,
    horaSelecionada?: number,
    minutoSelecionado = 0
  ) {
    const dataBase =
      dataSelecionada ??
      new Date();

    setData(
      obterDataString(dataBase)
    );

    if (
      horaSelecionada !==
      undefined
    ) {
      setHora(
        `${String(
          horaSelecionada
        ).padStart(
          2,
          "0"
        )}:${String(
          minutoSelecionado
        ).padStart(
          2,
          "0"
        )}`
      );
    } else {
      setHora("");
    }

    setClienteId("");
    setTipoAtendimento("avulso");
    setAssinaturasPlano([]);
    setAssinaturaPlanoId("");
    setServicosSelecionados([]);
    setObservacoes("");
    setMensagem("");

    setMostrarModal(true);
  }

  function abrirFicha(
    agendamento: Agendamento
  ) {
    setAgendamentoSelecionado(
      agendamento
    );

    const dataAgendamento =
      new Date(
        agendamento.data_hora
      );

    setData(
      obterDataString(
        dataAgendamento
      )
    );

    setHora(
      dataAgendamento.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    );

    setTipoAtendimento(
      agendamento.origem === "plano"
        ? "plano"
        : "avulso"
    );

    setAssinaturaPlanoId(
      agendamento.assinatura_plano_id || ""
    );

    setServicosSelecionados(
      obterServicosDoAgendamento(
        agendamento
      ).map(
        (servico) =>
          servico.id
      )
    );

    setObservacoes(
      agendamento.observacoes ??
        ""
    );

    setMensagem("");
    setMostrarFicha(true);
  }

  function fecharFicha() {
    setMostrarFicha(false);
    setAgendamentoSelecionado(
      null
    );
    setMensagem("");
    setServicosSelecionados([]);
    setTipoAtendimento("avulso");
    setAssinaturasPlano([]);
    setAssinaturaPlanoId("");
  }

  async function carregarPlanosDoCliente(clienteSelecionadoId: string) {
    setAssinaturasPlano([]);
    setAssinaturaPlanoId("");

    if (!clienteSelecionadoId || !barbeariaId) {
      return;
    }

    setCarregandoPlanosCliente(true);

    const supabase = createClient();

    const { data: assinaturas, error: assinaturaError } =
      await supabase
        .from("assinaturas_planos")
        .select(
          "id, plano_id, data_vencimento, status"
        )
        .eq("barbearia_id", barbeariaId)
        .eq("cliente_id", clienteSelecionadoId)
        .in("status", ["ativo", "vencendo"])
        .order("data_vencimento", {
          ascending: true,
          nullsFirst: false,
        });

    if (assinaturaError) {
      console.error(
        "ERRO AO BUSCAR PLANOS DO CLIENTE:",
        JSON.stringify(assinaturaError, null, 2)
      );
      setCarregandoPlanosCliente(false);
      return;
    }

    const assinaturasValidas = (assinaturas ?? []).filter((assinatura) => {
      if (!assinatura.data_vencimento) {
        return true;
      }

      const vencimento = new Date(
        `${assinatura.data_vencimento}T23:59:59`
      );

      return vencimento >= new Date();
    });

    if (assinaturasValidas.length === 0) {
      setCarregandoPlanosCliente(false);
      return;
    }

    const idsPlanos = [
      ...new Set(
        assinaturasValidas.map((assinatura) => assinatura.plano_id)
      ),
    ];

    const { data: planosData, error: planosError } =
      await supabase
        .from("planos")
        .select("id, nome")
        .in("id", idsPlanos);

    if (planosError) {
      console.error(
        "ERRO AO BUSCAR NOMES DOS PLANOS:",
        JSON.stringify(planosError, null, 2)
      );
      setCarregandoPlanosCliente(false);
      return;
    }

    const { data: planoServicosData, error: planoServicosError } =
      await supabase
        .from("plano_servicos")
        .select("plano_id, servico_id, quantidade")
        .in("plano_id", idsPlanos);

    if (planoServicosError) {
      console.error(
        "ERRO AO BUSCAR SERVIÇOS DOS PLANOS:",
        JSON.stringify(planoServicosError, null, 2)
      );
      setCarregandoPlanosCliente(false);
      return;
    }

    const idsAssinaturas = assinaturasValidas.map(
      (assinatura) => assinatura.id
    );

    const { data: usosData, error: usosError } = await supabase
      .from("usos_planos")
      .select("assinatura_id, servico_id, quantidade")
      .in("assinatura_id", idsAssinaturas);

    if (usosError) {
      console.error(
        "ERRO AO BUSCAR UTILIZAÇÕES DOS PLANOS:",
        JSON.stringify(usosError, null, 2)
      );
      setCarregandoPlanosCliente(false);
      return;
    }

    const planosMap = new Map(
      (planosData ?? []).map((plano) => [plano.id, plano.nome])
    );

    const assinaturasComPlanos: AssinaturaPlano[] = assinaturasValidas.map(
      (assinatura) => {
        const servicosDoPlano = (planoServicosData ?? []).filter(
          (item) => item.plano_id === assinatura.plano_id
        );

        const servicos = servicosDoPlano.map((item) => {
          const usado = (usosData ?? [])
            .filter(
              (uso) =>
                uso.assinatura_id === assinatura.id &&
                uso.servico_id === item.servico_id
            )
            .reduce(
              (total, uso) => total + Number(uso.quantidade || 0),
              0
            );

          const quantidade = Number(item.quantidade || 0);

          return {
            servico_id: item.servico_id,
            quantidade,
            usado,
            restante: Math.max(0, quantidade - usado),
          };
        });

        return {
          id: assinatura.id,
          plano_id: assinatura.plano_id,
          plano_nome: planosMap.get(assinatura.plano_id) || "Plano",
          data_vencimento: assinatura.data_vencimento,
          status: assinatura.status,
          servicos,
        };
      }
    );

    setAssinaturasPlano(assinaturasComPlanos);
    setCarregandoPlanosCliente(false);
  }

  function assinaturaPlanoSelecionadaAtual() {
    return assinaturasPlano.find(
      (assinatura) => assinatura.id === assinaturaPlanoId
    ) ?? null;
  }

  function servicoDisponivelNoPlano(servicoId: string) {
    const assinatura = assinaturaPlanoSelecionadaAtual();

    if (!assinatura) {
      return null;
    }

    return (
      assinatura.servicos.find(
        (servico) => servico.servico_id === servicoId
      ) ?? null
    );
  }

  function validarServicosDoPlano() {
    if (tipoAtendimento !== "plano") {
      return true;
    }

    if (!assinaturaPlanoId) {
      setMensagem("Selecione o plano que será utilizado neste atendimento.");
      return false;
    }

    if (servicosSelecionados.length === 0) {
      setMensagem("Selecione pelo menos um serviço.");
      return false;
    }

    for (const servicoId of servicosSelecionados) {
      const item = servicoDisponivelNoPlano(servicoId);

      if (!item) {
        const servico = servicos.find(
          (itemServico) => itemServico.id === servicoId
        );

        setMensagem(
          `O serviço "${servico?.nome || "selecionado"}" não faz parte deste plano.`
        );
        return false;
      }

      if (item.restante <= 0) {
        const servico = servicos.find(
          (itemServico) => itemServico.id === servicoId
        );

        setMensagem(
          `O serviço "${servico?.nome || "selecionado"}" não possui mais utilizações disponíveis neste plano.`
        );
        return false;
      }
    }

    return true;
  }

  async function registrarUsosDoPlano(
    agendamentoId: string,
    assinaturaId: string
  ) {
    const supabase = createClient();

    for (const servicoId of servicosSelecionados) {
      const { error } = await supabase.rpc(
        "registrar_uso_plano",
        {
          p_assinatura_id: assinaturaId,
          p_agendamento_id: agendamentoId,
          p_servico_id: servicoId,
        }
      );

      if (error) {
        throw new Error(
          error.message ||
            "Não foi possível descontar o serviço do plano."
        );
      }
    }
  }

  async function criarAgendamento(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensagem("");

    if (!clienteId) {
      setMensagem(
        "Selecione um cliente."
      );
      return;
    }

    if (
      servicosSelecionados.length ===
      0
    ) {
      setMensagem(
        "Selecione pelo menos um serviço."
      );
      return;
    }

    if (!data || !hora) {
      setMensagem(
        "Selecione a data e o horário."
      );
      return;
    }

    if (!validarServicosDoPlano()) {
      return;
    }

    setSalvando(true);

    const supabase = createClient();

    const dataHora = new Date(
      `${data}T${hora}`
    );

    /*
     * MANTEMOS O PRIMEIRO SERVIÇO
     * NO servico_id ANTIGO PARA
     * COMPATIBILIDADE COM O SISTEMA.
     */

    const primeiroServico =
      servicosSelecionados[0];

    const {
      data: novoAgendamento,
      error,
    } = await supabase
      .from("agendamentos")
      .insert({
        barbearia_id:
          barbeariaId,
        cliente_id:
          clienteId,
        servico_id:
          primeiroServico,
        data_hora:
          dataHora.toISOString(),
        status: "agendado",
        origem: tipoAtendimento,
        assinatura_plano_id:
          tipoAtendimento === "plano"
            ? assinaturaPlanoId
            : null,
        plano_id:
          tipoAtendimento === "plano"
            ? assinaturaPlanoSelecionadaAtual()?.plano_id ?? null
            : null,
        observacoes:
          observacoes.trim() ||
          null,
      })
      .select(
        "id"
      )
      .single();

    if (error) {
      console.error(
        "ERRO AO CRIAR AGENDAMENTO:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível criar o agendamento."
      );

      setSalvando(false);
      return;
    }

    /*
     * CRIA OS SERVIÇOS RELACIONADOS
     */

    const registrosServicos =
      servicosSelecionados.map(
        (servicoId) => ({
          agendamento_id:
            novoAgendamento.id,
          servico_id:
            servicoId,
        })
      );

    const {
      error:
        erroServicos,
    } = await supabase
      .from(
        "agendamento_servicos"
      )
      .insert(
        registrosServicos
      );

    if (erroServicos) {
      console.error(
        "ERRO AO VINCULAR SERVIÇOS:",
        JSON.stringify(
          erroServicos,
          null,
          2
        )
      );

      /*
       * Remove o agendamento caso
       * não consiga salvar os serviços.
       */

      await supabase
        .from("agendamentos")
        .delete()
        .eq(
          "id",
          novoAgendamento.id
        );

      setMensagem(
        "Não foi possível salvar os serviços do atendimento."
      );

      setSalvando(false);
      return;
    }

    if (
      tipoAtendimento === "plano" &&
      assinaturaPlanoId
    ) {
      try {
        await registrarUsosDoPlano(
          novoAgendamento.id,
          assinaturaPlanoId
        );
      } catch (erroPlano) {
        console.error(
          "ERRO AO DESCONTAR UTILIZAÇÃO DO PLANO:",
          erroPlano
        );

        await supabase
          .from("agendamentos")
          .delete()
          .eq("id", novoAgendamento.id)
          .eq("barbearia_id", barbeariaId);

        setMensagem(
          erroPlano instanceof Error
            ? erroPlano.message
            : "Não foi possível descontar o atendimento do plano."
        );

        setSalvando(false);
        return;
      }
    }

    setMostrarModal(false);
    setSalvando(false);

    await carregarAgendamentos();
  }

  async function salvarAlteracao() {
    if (!agendamentoSelecionado) {
      return;
    }

    if (!data || !hora) {
      setMensagem(
        "Informe a data e o horário."
      );
      return;
    }

    if (
      servicosSelecionados.length ===
      0
    ) {
      setMensagem(
        "Selecione pelo menos um serviço."
      );
      return;
    }

    if (agendamentoSelecionado.origem === "plano") {
      const servicosOriginais = obterServicosDoAgendamento(
        agendamentoSelecionado
      )
        .map((servico) => servico.id)
        .sort();

      const servicosNovos = [...servicosSelecionados].sort();

      if (
        JSON.stringify(servicosOriginais) !==
        JSON.stringify(servicosNovos)
      ) {
        setMensagem(
          "Este atendimento foi marcado como uso de plano. Para evitar inconsistências no saldo, os serviços do plano não podem ser alterados nesta ficha."
        );
        return;
      }
    }

    setSalvando(true);
    setMensagem("");

    const supabase = createClient();

    const dataHora = new Date(
      `${data}T${hora}`
    );

    const primeiroServico =
      servicosSelecionados[0];

    /*
     * ATUALIZA O AGENDAMENTO
     */

    const { error } = await supabase
      .from("agendamentos")
      .update({
        data_hora:
          dataHora.toISOString(),

        /*
         * Mantém compatibilidade.
         */
        servico_id:
          primeiroServico,

        origem:
          agendamentoSelecionado.origem || "avulso",
        assinatura_plano_id:
          agendamentoSelecionado.assinatura_plano_id || null,
        plano_id:
          agendamentoSelecionado.plano_id || null,

        observacoes:
          observacoes.trim() ||
          null,
      })
      .eq(
        "id",
        agendamentoSelecionado.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO ALTERAR AGENDAMENTO:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível alterar o agendamento."
      );

      setSalvando(false);
      return;
    }

    /*
     * REMOVE OS SERVIÇOS ANTIGOS
     */

    const {
      error:
        erroRemover,
    } = await supabase
      .from(
        "agendamento_servicos"
      )
      .delete()
      .eq(
        "agendamento_id",
        agendamentoSelecionado.id
      );

    if (erroRemover) {
      console.error(
        "ERRO AO REMOVER SERVIÇOS ANTIGOS:",
        JSON.stringify(
          erroRemover,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível atualizar os serviços."
      );

      setSalvando(false);
      return;
    }

    /*
     * INSERE OS NOVOS SERVIÇOS
     */

    const novosRegistros =
      servicosSelecionados.map(
        (servicoId) => ({
          agendamento_id:
            agendamentoSelecionado.id,
          servico_id:
            servicoId,
        })
      );

    const {
      error:
        erroNovosServicos,
    } = await supabase
      .from(
        "agendamento_servicos"
      )
      .insert(
        novosRegistros
      );

    if (erroNovosServicos) {
      console.error(
        "ERRO AO SALVAR NOVOS SERVIÇOS:",
        JSON.stringify(
          erroNovosServicos,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível salvar os novos serviços."
      );

      setSalvando(false);
      return;
    }

    setSalvando(false);

    fecharFicha();

    await carregarAgendamentos();
  }

  async function alterarStatus(
    novoStatus: string
  ) {
    if (!agendamentoSelecionado) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: novoStatus,
      })
      .eq(
        "id",
        agendamentoSelecionado.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO ALTERAR STATUS:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível alterar o status."
      );

      return;
    }

    setAgendamentoSelecionado({
      ...agendamentoSelecionado,
      status: novoStatus,
    });

    await carregarAgendamentos();
  }

  async function cancelarAgendamento() {
    if (!agendamentoSelecionado) {
      return;
    }

    const confirmar =
      window.confirm(
        "Deseja cancelar este agendamento?"
      );

    if (!confirmar) {
      return;
    }

    const supabase = createClient();

    if (agendamentoSelecionado.origem === "plano") {
      const { error: erroEstorno } = await supabase.rpc(
        "estornar_usos_agendamento_plano",
        {
          p_agendamento_id: agendamentoSelecionado.id,
        }
      );

      if (erroEstorno) {
        console.error(
          "ERRO AO ESTORNAR USO DO PLANO:",
          JSON.stringify(erroEstorno, null, 2)
        );

        setMensagem(
          "Não foi possível devolver a utilização ao plano. O agendamento não foi cancelado."
        );
        return;
      }
    }

    await alterarStatus("cancelado");

    fecharFicha();
  }

  async function excluirAgendamento() {
    if (!agendamentoSelecionado) {
      return;
    }

    const confirmar =
      window.confirm(
        "Deseja realmente excluir este agendamento?"
      );

    if (!confirmar) {
      return;
    }

    const supabase = createClient();

    if (agendamentoSelecionado.origem === "plano") {
      const { error: erroEstorno } = await supabase.rpc(
        "estornar_usos_agendamento_plano",
        {
          p_agendamento_id: agendamentoSelecionado.id,
        }
      );

      if (erroEstorno) {
        console.error(
          "ERRO AO ESTORNAR USO DO PLANO:",
          JSON.stringify(erroEstorno, null, 2)
        );

        setMensagem(
          "Não foi possível devolver a utilização ao plano. O agendamento não foi excluído."
        );
        return;
      }
    }

    const { error } = await supabase
      .from("agendamentos")
      .delete()
      .eq(
        "id",
        agendamentoSelecionado.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO EXCLUIR AGENDAMENTO:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setMensagem(
        "Não foi possível excluir o agendamento."
      );

      return;
    }

    fecharFicha();

    await carregarAgendamentos();
  }

  function confirmarPresenca() {
    const agendamento = agendamentoSelecionado;
    if (!agendamento) return;
    const telefone = agendamento.cliente?.telefone;
    if (!telefone) {
      setMensagem("Este cliente não possui telefone cadastrado.");
      return;
    }
    let numero = telefone.replace(/\D/g, "");
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
    const dataAgendamento = new Date(agendamento.data_hora);
    const dataFormatada = dataAgendamento.toLocaleDateString("pt-BR");
    const horaFormatada = dataAgendamento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const servicos = obterServicosDoAgendamento(agendamento).map((servico) => servico.nome).join(" + ");
    const valor = formatarPreco(obterPrecoAgendamento(agendamento));
    const modelo = mensagemConfirmacao || "Olá, {cliente}! 👋\n\nAqui é da {barbearia}.\n\nPassando para confirmar seu horário no dia {data} às {horario}.\n\nSeu atendimento será com {profissional}. 💈\n\nPodemos contar com sua presença?";
    const mensagem = modelo
      .replaceAll("{cliente}", agendamento.cliente?.nome || "cliente")
      .replaceAll("{barbearia}", barbeariaNome || "nossa barbearia")
      .replaceAll("{data}", dataFormatada)
      .replaceAll("{horario}", horaFormatada)
      .replaceAll("{profissional}", "Nossa equipe")
      .replaceAll("{servicos}", servicos || "seu atendimento")
      .replaceAll("{valor}", valor);
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function obterMinutoDoArraste(
    evento: React.DragEvent<HTMLButtonElement>
  ) {
    const elemento =
      evento.currentTarget;

    const rect =
      elemento.getBoundingClientRect();

    const posicaoY =
      evento.clientY -
      rect.top;

    return posicaoY >=
      ALTURA_HORA / 2
      ? 30
      : 0;
  }

  function formatarDestinoArraste() {
    if (!arrasteDestino) {
      return "";
    }

    return `${String(
      arrasteDestino.hora
    ).padStart(
      2,
      "0"
    )}:${String(
      arrasteDestino.minuto
    ).padStart(
      2,
      "0"
    )}`;
  }

  function existeConflito(
    agendamentoMovido: Agendamento,
    novaDataHora: Date
  ) {
    const duracaoMovido =
      obterDuracaoAgendamento(
        agendamentoMovido
      );

    const inicioNovo =
      novaDataHora.getTime();

    const fimNovo =
      inicioNovo +
      duracaoMovido *
        60 *
        1000;

    return agendamentos.find(
      (outro) => {
        if (
          outro.id ===
          agendamentoMovido.id
        ) {
          return false;
        }

        if (
          outro.status ===
          "cancelado"
        ) {
          return false;
        }

        const inicioOutro =
          new Date(
            outro.data_hora
          ).getTime();

        const duracaoOutro =
          obterDuracaoAgendamento(
            outro
          );

        const fimOutro =
          inicioOutro +
          duracaoOutro *
            60 *
            1000;

        return (
          inicioNovo <
            fimOutro &&
          fimNovo >
            inicioOutro
        );
      }
    );
  }

  async function moverAgendamento(
    agendamento: Agendamento,
    novaData: string,
    novaHora: number,
    novoMinuto: number
  ) {
    const novaDataHora =
      new Date(
        `${novaData}T${String(
          novaHora
        ).padStart(
          2,
          "0"
        )}:${String(
          novoMinuto
        ).padStart(
          2,
          "0"
        )}`
      );

    const conflito =
      existeConflito(
        agendamento,
        novaDataHora
      );

    if (conflito) {
      const nomeConflito =
        conflito.cliente
          ?.nome ??
        "outro cliente";

      const continuar =
        window.confirm(
          `⚠️ Atenção!\n\nEste horário entra em conflito com o atendimento de ${nomeConflito}.\n\nDeseja mesmo mover o agendamento para ${novaHora
            .toString()
            .padStart(
              2,
              "0"
            )}:${novoMinuto
            .toString()
            .padStart(
              2,
              "0"
            )}?`
        );

      if (!continuar) {
        setArrasteDestino(null);
        setAgendamentoArrastado(null);
        return;
      }
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("agendamentos")
      .update({
        data_hora:
          novaDataHora.toISOString(),
      })
      .eq(
        "id",
        agendamento.id
      )
      .eq(
        "barbearia_id",
        barbeariaId
      );

    if (error) {
      console.error(
        "ERRO AO MOVER AGENDAMENTO:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      alert(
        "Não foi possível mover o agendamento."
      );

      setArrasteDestino(null);
      setAgendamentoArrastado(null);

      return;
    }

    setArrasteDestino(null);
    setAgendamentoArrastado(null);

    await carregarAgendamentos();
  }

  function voltarSemana() {
    const novaData =
      new Date(semanaAtual);

    novaData.setDate(
      novaData.getDate() - 7
    );

    setSemanaAtual(
      novaData
    );
  }

  function avancarSemana() {
    const novaData =
      new Date(semanaAtual);

    novaData.setDate(
      novaData.getDate() + 7
    );

    setSemanaAtual(
      novaData
    );
  }

  function irParaHoje() {
    setSemanaAtual(
      obterInicioDaSemana(
        new Date()
      )
    );
  }

  function obterAgendamentosDoDia(
    data: Date
  ) {
    const inicio =
      new Date(data);

    inicio.setHours(
      0,
      0,
      0,
      0
    );

    const fim =
      new Date(data);

    fim.setHours(
      23,
      59,
      59,
      999
    );

    return agendamentos.filter(
      (agendamento) => {
        const horario =
          new Date(
            agendamento.data_hora
          );

        return (
          horario >= inicio &&
          horario <= fim
        );
      }
    );
  }

  function calcularPosicao(
    dataHora: string
  ) {
    const data =
      new Date(dataHora);

    const minutos =
      data.getHours() * 60 +
      data.getMinutes();

    const inicio =
      HORA_INICIAL * 60;

    return (
      ((minutos - inicio) /
        60) *
      ALTURA_HORA
    );
  }

  function calcularAltura(
    duracao?: number
  ) {
    const minutos =
      duracao ?? 30;

    return Math.max(
      (minutos / 60) *
        ALTURA_HORA,
      42
    );
  }

  function calcularPosicaoAgora() {
    const minutos =
      agora.getHours() * 60 +
      agora.getMinutes();

    const inicio =
      HORA_INICIAL * 60;

    const fim =
      HORA_FINAL * 60;

    if (
      minutos < inicio ||
      minutos > fim
    ) {
      return null;
    }

    return (
      ((minutos - inicio) /
        60) *
      ALTURA_HORA
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

  function formatarDataCompleta(
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

  function ehHoje(
    data: Date
  ) {
    const hoje =
      new Date();

    return (
      hoje.getFullYear() ===
        data.getFullYear() &&
      hoje.getMonth() ===
        data.getMonth() &&
      hoje.getDate() ===
        data.getDate()
    );
  }

  function classeAgendamento(
    status: string
  ) {
    if (
      status === "confirmado"
    ) {
      return "bg-blue-600 border-blue-400";
    }

    if (
      status === "concluido"
    ) {
      return "bg-green-600 border-green-400";
    }

    if (
      status === "cancelado"
    ) {
      return "bg-red-600 border-red-400";
    }

    return "bg-zinc-700 border-zinc-500";
  }

  function textoStatus(
    status: string
  ) {
    if (
      status === "confirmado"
    ) {
      return "Confirmado";
    }

    if (
      status === "concluido"
    ) {
      return "Concluído";
    }

    if (
      status === "cancelado"
    ) {
      return "Cancelado";
    }

    return "Agendado";
  }

  const posicaoAgora =
    calcularPosicaoAgora();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* HEADER */}

      <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">

        <div className="px-4 md:px-6 py-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="w-10 h-10 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ←
              </button>

              <div>
                <div className="flex items-center gap-2">

                  <h1 className="text-xl md:text-2xl font-bold">
                    Agenda
                  </h1>

                  <span className="hidden sm:inline-flex px-2 py-1 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
                    SEMANAL
                  </span>

                </div>

                <p className="text-xs text-zinc-500 mt-1">
                  Organize seus atendimentos e horários.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500 mr-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Agenda ativa
              </div>

              <button
                onClick={() =>
                  abrirNovoAgendamento()
                }
                className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition shadow-lg"
              >
                + Novo agendamento
              </button>

            </div>

          </div>

          {/* RESUMO */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Semana
              </p>

              <p className="text-xl font-bold mt-1">
                {totalSemana}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                atendimentos ativos
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Hoje
              </p>

              <p className="text-xl font-bold mt-1">
                {totalHoje}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                atendimentos
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Confirmados
              </p>

              <p className="text-xl font-bold mt-1 text-blue-400">
                {totalConfirmados}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                nesta semana
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Concluídos
              </p>

              <p className="text-xl font-bold mt-1 text-green-400">
                {totalConcluidos}
              </p>

              <p className="text-[10px] text-zinc-600 mt-1">
                nesta semana
              </p>
            </div>

          </div>

        </div>

      </header>

      {/* CONTROLES */}

      <section className="border-b border-zinc-800 bg-zinc-900">

        <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div className="flex items-center gap-2">

            <button
              onClick={
                voltarSemana
              }
              className="w-9 h-9 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition"
            >
              ←
            </button>

            <button
              onClick={
                irParaHoje
              }
              className="border border-zinc-700 px-4 h-9 rounded-lg text-sm hover:bg-zinc-800 transition"
            >
              Hoje
            </button>

            <button
              onClick={
                avancarSemana
              }
              className="w-9 h-9 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition"
            >
              →
            </button>

          </div>

          <div className="text-center">

            <h2 className="font-semibold capitalize">
              {semanaAtual.toLocaleDateString(
                "pt-BR",
                {
                  month: "long",
                  year: "numeric",
                }
              )}
            </h2>

            <p className="text-xs text-zinc-500 mt-1">
              Arraste para qualquer horário de 30 em 30 minutos
            </p>

          </div>

          <div className="flex justify-center md:justify-end">

            <span className="border border-zinc-700 px-4 h-9 rounded-lg text-sm flex items-center text-zinc-400">
              Semana
            </span>

          </div>

        </div>

      </section>

      {/* AVISO DURANTE ARRASTE */}

      {agendamentoArrastado && (
        <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-4 py-3">

          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                🖱️
              </div>

              <div>

                <p className="text-sm font-medium">
                  Movendo{" "}
                  {agendamentoArrastado.cliente?.nome ??
                    "agendamento"}
                </p>

                <p className="text-xs text-zinc-500">
                  Solte no horário desejado
                </p>

              </div>

            </div>

            {arrasteDestino && (
              <div className="px-3 py-2 rounded-lg bg-white text-black text-xs font-bold">
                {formatarDestinoArraste()}
              </div>
            )}

          </div>

        </div>
      )}

      {/* AGENDA */}

      <section className="p-3 md:p-6">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">

          <div className="overflow-x-auto">

            <div
              className="min-w-[1050px]"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "70px repeat(7, minmax(140px, 1fr))",
              }}
            >

              {/* CABEÇALHO */}

              <div className="h-24 border-b border-r border-zinc-800 bg-zinc-950 flex items-end justify-center pb-4">

                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Horário
                </span>

              </div>

              {diasDaSemana.map(
                (dia) => {

                  const quantidade =
                    obterAgendamentosDoDia(
                      dia
                    ).filter(
                      (item) =>
                        item.status !==
                        "cancelado"
                    ).length;

                  return (
                    <button
                      key={dia.toISOString()}
                      onClick={() =>
                        abrirNovoAgendamento(
                          dia
                        )
                      }
                      className={`h-24 border-b border-r border-zinc-800 p-3 text-center hover:bg-zinc-800 transition ${
                        ehHoje(dia)
                          ? "bg-zinc-800/90"
                          : "bg-zinc-950"
                      }`}
                    >

                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {dia.toLocaleDateString(
                          "pt-BR",
                          {
                            weekday:
                              "short",
                          }
                        )}
                      </p>

                      <p
                        className={`text-2xl font-bold mt-1 ${
                          ehHoje(dia)
                            ? "text-white"
                            : "text-zinc-300"
                        }`}
                      >
                        {dia.getDate()}
                      </p>

                      <div className="flex justify-center mt-1">

                        {ehHoje(dia) ? (
                          <span className="text-[9px] bg-white text-black px-2 py-0.5 rounded-full font-bold">
                            HOJE • {quantidade}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-600">
                            {quantidade} atendimento
                            {quantidade !== 1
                              ? "s"
                              : ""}
                          </span>
                        )}

                      </div>

                    </button>
                  );
                }
              )}

              {/* COLUNA HORÁRIOS */}

              <div className="bg-zinc-950">

                {horas.map(
                  (hora) => (

                    <div
                      key={hora}
                      className="relative h-20 border-b border-r border-zinc-800"
                    >

                      <span className="absolute top-2 left-0 right-0 text-center text-xs text-zinc-500">
                        {String(
                          hora
                        ).padStart(
                          2,
                          "0"
                        )}
                        :00
                      </span>

                      <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-zinc-700">
                        :30
                      </span>

                    </div>

                  )
                )}

              </div>

              {/* DIAS */}

              {diasDaSemana.map(
                (dia) => {

                  const agendamentosDoDia =
                    obterAgendamentosDoDia(
                      dia
                    );

                  const dataString =
                    obterDataString(
                      dia
                    );

                  const hoje =
                    ehHoje(dia);

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`relative border-r border-zinc-800 ${
                        hoje
                          ? "bg-zinc-900/50"
                          : ""
                      }`}
                      style={{
                        height:
                          horas.length *
                          ALTURA_HORA,
                      }}
                      onDragLeave={() => {
                        if (
                          arrasteDestino
                            ?.data ===
                          dataString
                        ) {
                          setArrasteDestino(
                            null
                          );
                        }
                      }}
                    >

                      {/* ÁREAS DE DROP */}

                      {horas.map(
                        (hora) => {

                          const destinoAtivo =
                            arrasteDestino
                              ?.data ===
                              dataString &&
                            arrasteDestino
                              ?.hora ===
                              hora;

                          return (
                            <button
                              key={hora}
                              type="button"
                              onClick={() => {
                                if (
                                  agendamentoArrastado
                                ) {
                                  return;
                                }

                                abrirNovoAgendamento(
                                  dia,
                                  hora,
                                  0
                                );
                              }}
                              onDragOver={(e) => {
                                if (
                                  !agendamentoArrastado
                                ) {
                                  return;
                                }

                                e.preventDefault();

                                e.dataTransfer.dropEffect =
                                  "move";

                                const minuto =
                                  obterMinutoDoArraste(
                                    e
                                  );

                                setArrasteDestino({
                                  data: dataString,
                                  hora,
                                  minuto,
                                });
                              }}
                              onDrop={(e) => {
                                e.preventDefault();

                                if (
                                  !agendamentoArrastado
                                ) {
                                  return;
                                }

                                const minuto =
                                  obterMinutoDoArraste(
                                    e
                                  );

                                moverAgendamento(
                                  agendamentoArrastado,
                                  dataString,
                                  hora,
                                  minuto
                                );
                              }}
                              className={`absolute left-0 right-0 border-b border-zinc-800/70 transition ${
                                destinoAtivo
                                  ? "bg-white/10"
                                  : "hover:bg-zinc-800/30"
                              }`}
                              style={{
                                top:
                                  (hora -
                                    HORA_INICIAL) *
                                  ALTURA_HORA,
                                height:
                                  ALTURA_HORA,
                                zIndex: 1,
                              }}
                            >

                              <div className="absolute left-0 right-0 bottom-0 border-t border-dashed border-zinc-800/60 pointer-events-none" />

                              {destinoAtivo && (
                                <div className="absolute left-2 right-2 top-2 bottom-2 rounded-xl border border-dashed border-white/30 bg-white/5 flex items-center justify-center pointer-events-none">

                                  <span className="text-[10px] font-semibold text-zinc-200 bg-black/30 px-2 py-1 rounded-full">
                                    Soltar às{" "}
                                    {formatarDestinoArraste()}
                                  </span>

                                </div>
                              )}

                            </button>
                          );
                        }
                      )}

                      {/* LINHA DO AGORA */}

                      {hoje &&
                        posicaoAgora !==
                          null && (
                          <div
                            className="absolute left-0 right-0 z-30 pointer-events-none"
                            style={{
                              top:
                                posicaoAgora,
                            }}
                          >

                            <div className="relative">

                              <div className="absolute left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />

                              <span className="absolute -top-3 left-2 bg-white text-black text-[9px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap">
                                Agora •{" "}
                                {agora.toLocaleTimeString(
                                  "pt-BR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>

                            </div>

                          </div>
                        )}

                      {/* AGENDAMENTOS */}

                      {agendamentosDoDia.map(
                        (agendamento) => {

                          const duracao =
                            obterDuracaoAgendamento(
                              agendamento
                            );

                          const listaServicos =
                            obterServicosDoAgendamento(
                              agendamento
                            );

                          const sendoArrastado =
                            agendamentoArrastado
                              ?.id ===
                            agendamento.id;

                          return (
                            <button
                              key={
                                agendamento.id
                              }
                              type="button"
                              draggable={
                                agendamento.status !==
                                "cancelado"
                              }
                              onDragStart={(
                                e
                              ) => {

                                setAgendamentoArrastado(
                                  agendamento
                                );

                                e.dataTransfer.effectAllowed =
                                  "move";

                                e.dataTransfer.setData(
                                  "text/plain",
                                  agendamento.id
                                );
                              }}
                              onDragEnd={() => {
                                setAgendamentoArrastado(
                                  null
                                );

                                setArrasteDestino(
                                  null
                                );
                              }}
                              onClick={(
                                e
                              ) => {
                                e.stopPropagation();

                                if (
                                  agendamentoArrastado
                                ) {
                                  return;
                                }

                                abrirFicha(
                                  agendamento
                                );
                              }}
                              className={`absolute left-1 right-1 rounded-xl border p-2.5 text-left shadow-lg overflow-hidden transition-all ${
                                classeAgendamento(
                                  agendamento.status
                                )
                              } ${
                                agendamento.status !==
                                "cancelado"
                                  ? "cursor-grab active:cursor-grabbing hover:brightness-110 hover:shadow-xl hover:-translate-y-[1px]"
                                  : "cursor-pointer opacity-60"
                              } ${
                                sendoArrastado
                                  ? "opacity-30 scale-95"
                                  : ""
                              }`}
                              style={{
                                top:
                                  calcularPosicao(
                                    agendamento.data_hora
                                  ),
                                height:
                                  calcularAltura(
                                    duracao
                                  ),
                                zIndex: 10,
                              }}
                            >

                              <div className="flex items-start justify-between gap-2">

                                <p className="text-[10px] opacity-80 font-medium">
                                  {formatarHora(
                                    agendamento.data_hora
                                  )}
                                </p>

                                {agendamento.status !==
                                  "cancelado" && (
                                  <span className="text-[9px] opacity-60">
                                    ⋮⋮
                                  </span>
                                )}

                              </div>

                              <p className="font-semibold text-xs mt-1 truncate">
                                {agendamento
                                  .cliente
                                  ?.nome ??
                                  "Cliente"}
                              </p>

                              {agendamento.origem === "plano" && (
                                <span className="inline-flex mt-1 text-[9px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-semibold">
                                  🎫 NO PLANO
                                </span>
                              )}

                              <p className="text-[10px] opacity-90 truncate mt-0.5">
                                ✂️{" "}
                                {listaServicos
                                  .map(
                                    (
                                      servico
                                    ) =>
                                      servico.nome
                                  )
                                  .join(
                                    " + "
                                  ) ||
                                  "Serviço"}
                              </p>

                              {duracao >=
                                45 && (
                                <p className="text-[9px] opacity-70 mt-1">
                                  {duracao} min
                                </p>
                              )}

                            </button>
                          );
                        }
                      )}

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </div>

      </section>

      {/* LEGENDA */}

      <section className="px-4 md:px-6 pb-6">

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-zinc-500">

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-zinc-700" />
              Agendado
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600" />
              Confirmado
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-600" />
              Concluído
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-600" />
              Cancelado
            </div>

            <span className="text-zinc-700">
              •
            </span>

            <span>
              🖱️ Arraste para remarcar
            </span>

            <span>
              •
            </span>

            <span>
              🕐 Horários de 30 em 30 minutos
            </span>

          </div>

        </div>

      </section>

      {/* MODAL NOVO AGENDAMENTO */}

      {mostrarModal && (

        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl my-8">

            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">

              <div>
                <h3 className="text-xl font-semibold">
                  Novo agendamento
                </h3>

                <p className="text-xs text-zinc-500 mt-1">
                  Escolha o cliente e os serviços.
                </p>
              </div>

              <button
                onClick={() =>
                  setMostrarModal(
                    false
                  )
                }
                className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-xl transition"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                criarAgendamento
              }
              className="p-6 space-y-5"
            >

              {/* CLIENTE */}

              <div>

                <label className="block text-sm font-medium mb-2">
                  Cliente
                </label>

                <select
                  value={clienteId}
                  onChange={(e) => {
                    const novoClienteId = e.target.value;
                    setClienteId(novoClienteId);
                    setTipoAtendimento("avulso");
                    setAssinaturaPlanoId("");
                    setMensagem("");
                    carregarPlanosDoCliente(novoClienteId);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                >

                  <option value="">
                    Selecione um cliente
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
                        {cliente.nome}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* TIPO DE ATENDIMENTO */}

              {clienteId && (
                <div>

                  <label className="block text-sm font-medium mb-2">
                    Tipo de atendimento
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoAtendimento("avulso");
                        setAssinaturaPlanoId("");
                        setMensagem("");
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        tipoAtendimento === "avulso"
                          ? "border-white bg-white/10"
                          : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800"
                      }`}
                    >
                      <p className="text-sm font-semibold">
                        💳 Avulso
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Cobrar normalmente
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={
                        carregandoPlanosCliente ||
                        assinaturasPlano.length === 0
                      }
                      onClick={() => {
                        if (assinaturasPlano.length === 0) {
                          return;
                        }

                        setTipoAtendimento("plano");
                        setAssinaturaPlanoId(
                          assinaturasPlano[0].id
                        );
                        setMensagem("");
                      }}
                      className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        tipoAtendimento === "plano"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800"
                      }`}
                    >
                      <p className="text-sm font-semibold">
                        🎫 No plano
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {carregandoPlanosCliente
                          ? "Verificando plano..."
                          : assinaturasPlano.length > 0
                          ? "Usar uma utilização"
                          : "Cliente sem plano ativo"}
                      </p>
                    </button>
                  </div>

                  {tipoAtendimento === "plano" && (
                    <div className="mt-3 space-y-3">
                      <select
                        value={assinaturaPlanoId}
                        onChange={(e) => {
                          setAssinaturaPlanoId(e.target.value);
                          setMensagem("");
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                      >
                        <option value="">
                          Selecione o plano
                        </option>

                        {assinaturasPlano.map((assinatura) => (
                          <option
                            key={assinatura.id}
                            value={assinatura.id}
                          >
                            {assinatura.plano_nome}
                            {assinatura.data_vencimento
                              ? ` — vence ${new Date(
                                  `${assinatura.data_vencimento}T12:00:00`
                                ).toLocaleDateString("pt-BR")}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {assinaturaPlanoSelecionadaAtual() && (
                        <div className="bg-emerald-950/20 border border-emerald-900/60 rounded-xl p-3">
                          <p className="text-xs text-emerald-400 font-semibold">
                            Utilizações disponíveis
                          </p>

                          <div className="mt-2 space-y-1">
                            {assinaturaPlanoSelecionadaAtual()!.servicos.map(
                              (item) => {
                                const servico = servicos.find(
                                  (servicoAtual) =>
                                    servicoAtual.id === item.servico_id
                                );

                                return (
                                  <div
                                    key={item.servico_id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-zinc-400">
                                      {servico?.nome || "Serviço"}
                                    </span>
                                    <span className="text-zinc-200 font-semibold">
                                      {item.restante}/{item.quantidade}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SERVIÇOS */}

              <div>

                <div className="flex items-center justify-between mb-2">

                  <label className="block text-sm font-medium">
                    Serviços
                  </label>

                  <span className="text-xs text-zinc-500">
                    {servicosSelecionados.length} selecionado
                    {servicosSelecionados.length !==
                    1
                      ? "s"
                      : ""}
                  </span>

                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">

                  {servicos.map(
                    (servico) => {

                      const selecionado =
                        servicosSelecionados.includes(
                          servico.id
                        );

                      return (
                        <button
                          key={
                            servico.id
                          }
                          type="button"
                          onClick={() =>
                            alternarServico(
                              servico.id
                            )
                          }
                          className={`w-full text-left border rounded-xl p-3 transition ${
                            selecionado
                              ? "border-white bg-white/10"
                              : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800"
                          }`}
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div className="flex items-center gap-3 min-w-0">

                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  selecionado
                                    ? "bg-white border-white text-black"
                                    : "border-zinc-600"
                                }`}
                              >
                                {selecionado &&
                                  "✓"}
                              </div>

                              <div className="min-w-0">

                                <p className="text-sm font-medium truncate">
                                  {servico.nome}
                                </p>

                                <p className="text-xs text-zinc-500 mt-0.5">
                                  ⏱️{" "}
                                  {
                                    servico.duracao_minutos
                                  }{" "}
                                  min
                                </p>

                              </div>

                            </div>

                            <p className="text-sm font-semibold shrink-0">
                              {formatarPreco(
                                servico.preco
                              )}
                            </p>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

                {/* RESUMO */}

                {servicosSelecionados.length >
                  0 && (

                  <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-xs text-zinc-500">
                          Duração total
                        </p>

                        <p className="text-lg font-bold mt-1">
                          {duracaoTotalFormulario <
                          60
                            ? `${duracaoTotalFormulario} min`
                            : `${Math.floor(
                                duracaoTotalFormulario /
                                  60
                              )}h ${
                                duracaoTotalFormulario %
                                  60
                              }min`}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-xs text-zinc-500">
                          Valor total
                        </p>

                        <p className="text-lg font-bold mt-1">
                          {formatarPreco(
                            precoTotalFormulario
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                )}

              </div>

              {/* DATA / HORA */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">
                    Data
                  </label>

                  <input
                    type="date"
                    value={data}
                    onChange={(e) =>
                      setData(
                        e.target.value
                      )
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">
                    Horário
                  </label>

                  <input
                    type="time"
                    value={hora}
                    onChange={(e) =>
                      setHora(
                        e.target.value
                      )
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white"
                  />

                </div>

              </div>

              {/* OBSERVAÇÕES */}

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
                  rows={3}
                  placeholder="Observações..."
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
                  onClick={() =>
                    setMostrarModal(
                      false
                    )
                  }
                  className="flex-1 border border-zinc-700 py-3 rounded-lg hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Agendar"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* FICHA */}

      {mostrarFicha &&
        agendamentoSelecionado && (

          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">

                <div>

                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Ficha do cliente
                  </p>

                  <h3 className="text-2xl font-bold mt-1">
                    {agendamentoSelecionado
                      .cliente
                      ?.nome ??
                      "Cliente"}
                  </h3>

                </div>

                <button
                  onClick={
                    fecharFicha
                  }
                  className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-2xl transition"
                >
                  ×
                </button>

              </div>

              <div className="p-6 space-y-6">

                {/* CLIENTE */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Informações do cliente
                  </h4>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">

                    <div>
                      <p className="text-xs text-zinc-500">
                        Nome
                      </p>

                      <p className="text-sm mt-1">
                        {agendamentoSelecionado
                          .cliente
                          ?.nome ??
                          "Não informado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Telefone
                      </p>

                      <p className="text-sm mt-1">
                        {agendamentoSelecionado
                          .cliente
                          ?.telefone ??
                          "Não informado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        E-mail
                      </p>

                      <p className="text-sm mt-1">
                        {agendamentoSelecionado
                          .cliente
                          ?.email ??
                          "Não informado"}
                      </p>
                    </div>

                  </div>

                </div>

                {/* SERVIÇOS */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Serviços do atendimento
                  </h4>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">

                    {obterServicosDoAgendamento(
                      agendamentoSelecionado
                    ).map(
                      (servico) => (

                        <div
                          key={
                            servico.id
                          }
                          className="p-4 border-b border-zinc-800 last:border-b-0"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div>

                              <p className="font-medium text-sm">
                                {servico.nome}
                              </p>

                              <p className="text-xs text-zinc-500 mt-1">
                                ⏱️{" "}
                                {
                                  servico.duracao_minutos
                                }{" "}
                                min
                              </p>

                            </div>

                            <p className="text-sm font-semibold">
                              {formatarPreco(
                                servico.preco
                              )}
                            </p>

                          </div>

                        </div>

                      )
                    )}

                    <div className="p-4 bg-zinc-900/50">

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="text-xs text-zinc-500">
                            Duração total
                          </p>

                          <p className="font-semibold mt-1">
                            {obterDuracaoAgendamento(
                              agendamentoSelecionado
                            )}{" "}
                            minutos
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-xs text-zinc-500">
                            Valor total
                          </p>

                          <p className="font-semibold mt-1">
                            {formatarPreco(
                              obterPrecoAgendamento(
                                agendamentoSelecionado
                              )
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                {/* AÇÕES */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Ações rápidas
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                    <button
                      onClick={() =>
                        alterarStatus(
                          "confirmado"
                        )
                      }
                      className="border border-blue-800 text-blue-400 py-2.5 rounded-lg text-xs hover:bg-blue-950/30 transition"
                    >
                      ✓ Confirmar
                    </button>

                    <button
                      onClick={() =>
                        alterarStatus(
                          "concluido"
                        )
                      }
                      className="border border-green-800 text-green-400 py-2.5 rounded-lg text-xs hover:bg-green-950/30 transition"
                    >
                      ✓ Concluir
                    </button>

                    <button
                      onClick={
                        cancelarAgendamento
                      }
                      className="border border-yellow-800 text-yellow-500 py-2.5 rounded-lg text-xs hover:bg-yellow-950/30 transition"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={confirmarPresenca}
                      className="border border-emerald-800 text-emerald-400 py-2.5 rounded-lg text-xs hover:bg-emerald-950/30 transition"
                    >
                      💬 WhatsApp
                    </button>

                  </div>

                </div>

                {agendamentoSelecionado.origem === "plano" && (
                  <div className="bg-emerald-950/20 border border-emerald-900/60 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 font-semibold">
                      🎫 Atendimento pelo plano
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Este atendimento está vinculado a uma assinatura de plano.
                    </p>
                  </div>
                )}

                {/* STATUS */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Status atual
                  </h4>

                  <span
                    className={`inline-flex px-3 py-2 rounded-full text-xs ${classeAgendamento(
                      agendamentoSelecionado.status
                    )}`}
                  >
                    {textoStatus(
                      agendamentoSelecionado.status
                    )}
                  </span>

                </div>

                {/* REMARCAR */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Remarcar atendimento
                  </h4>

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <label className="block text-xs text-zinc-500 mb-2">
                        Dia
                      </label>

                      <input
                        type="date"
                        value={data}
                        onChange={(e) =>
                          setData(
                            e.target.value
                          )
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 outline-none focus:border-white"
                      />

                    </div>

                    <div>

                      <label className="block text-xs text-zinc-500 mb-2">
                        Horário
                      </label>

                      <input
                        type="time"
                        value={hora}
                        onChange={(e) =>
                          setHora(
                            e.target.value
                          )
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 outline-none focus:border-white"
                      />

                    </div>

                  </div>

                </div>

                {/* EDITAR SERVIÇOS */}

                <div>

                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Serviços
                  </h4>

                  <div className="space-y-2 max-h-52 overflow-y-auto">

                    {servicos.map(
                      (servico) => {

                        const selecionado =
                          servicosSelecionados.includes(
                            servico.id
                          );

                        return (
                          <button
                            key={
                              servico.id
                            }
                            type="button"
                            onClick={() =>
                              alternarServico(
                                servico.id
                              )
                            }
                            className={`w-full text-left border rounded-xl p-3 transition ${
                              selecionado
                                ? "border-white bg-white/10"
                                : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800"
                            }`}
                          >

                            <div className="flex items-center justify-between gap-3">

                              <div className="flex items-center gap-3">

                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                    selecionado
                                      ? "bg-white border-white text-black"
                                      : "border-zinc-600"
                                  }`}
                                >
                                  {selecionado &&
                                    "✓"}
                                </div>

                                <div>

                                  <p className="text-sm font-medium">
                                    {
                                      servico.nome
                                    }
                                  </p>

                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    {
                                      servico.duracao_minutos
                                    }{" "}
                                    min
                                  </p>

                                </div>

                              </div>

                              <p className="text-sm font-semibold">
                                {formatarPreco(
                                  servico.preco
                                )}
                              </p>

                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>

                  {servicosSelecionados.length >
                    0 && (

                    <div className="mt-3 flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-3">

                      <span className="text-xs text-zinc-500">
                        {duracaoTotalFormulario}{" "}
                        min
                      </span>

                      <span className="text-sm font-semibold">
                        {formatarPreco(
                          precoTotalFormulario
                        )}
                      </span>

                    </div>

                  )}

                </div>

                {/* OBSERVAÇÕES */}

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
                    rows={3}
                    placeholder="Observações..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-white resize-none"
                  />

                </div>

                {/* AGENDAMENTO ATUAL */}

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                  <p className="text-xs text-zinc-500">
                    Agendamento atual
                  </p>

                  <p className="text-sm font-medium mt-1 capitalize">
                    {formatarDataCompleta(
                      agendamentoSelecionado.data_hora
                    )}
                  </p>

                  <p className="text-sm text-zinc-400 mt-1">
                    às{" "}
                    {formatarHora(
                      agendamentoSelecionado.data_hora
                    )}
                  </p>

                </div>

                {mensagem && (

                  <div className="bg-red-950/40 border border-red-900 rounded-lg p-3 text-sm text-red-300 text-center">
                    {mensagem}
                  </div>

                )}

                <button
                  onClick={
                    salvarAlteracao
                  }
                  disabled={
                    salvando
                  }
                  className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    onClick={
                      excluirAgendamento
                    }
                    className="border border-red-900 text-red-400 py-3 rounded-lg hover:bg-red-950/30 transition"
                  >
                    Excluir
                  </button>

                  <button
                    onClick={
                      fecharFicha
                    }
                    className="border border-zinc-700 text-zinc-300 py-3 rounded-lg hover:bg-zinc-800 transition"
                  >
                    Fechar
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

    </main>
  );
}