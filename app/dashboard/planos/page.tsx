"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBarbeariaDoUsuario } from "@/lib/barbearia";

type Periodicidade =
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  periodicidade: Periodicidade;
  ativo: boolean;
  criado_em: string;
};

type PlanoComClientes = Plano & {
  quantidadeClientes: number;
};

type Servico = {
  id: string;
  nome: string;
};

type ServicoSelecionado = {
  servicoId: string;
  quantidade: number;
};

type Cliente = {
  id: string;
  nome: string;
};

type Assinatura = {
  id: string;
  cliente_id: string;
  data_inicio: string;
  data_vencimento: string | null;
  valor: number;
  status:
    | "ativo"
    | "vencendo"
    | "inadimplente"
    | "cancelado"
    | "encerrado";
  observacoes: string | null;
  clienteNome: string;
};

type Cobranca = {
  id: string;
  assinatura_id: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status:
    | "pendente"
    | "pago"
    | "atrasado"
    | "cancelado";
  descricao: string | null;
};

export default function PlanosPage() {
  const supabase = createClient();

  const [planos, setPlanos] = useState<PlanoComClientes[]>([]);
  const [barbeariaId, setBarbeariaId] =
    useState<string | null>(null);

  const [tipoUsuario, setTipoUsuario] = useState<
    "dono" | "membro" | null
  >(null);

  const [cargo, setCargo] =
    useState<string | null>(null);

  const [busca, setBusca] =
    useState("");

  const [carregando, setCarregando] =
    useState(true);

  const [mensagem, setMensagem] =
    useState("");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  /* =====================================================
     FORMULÁRIO — NOVO PLANO
  ===================================================== */

  const [nomePlano, setNomePlano] =
    useState("");

  const [descricaoPlano, setDescricaoPlano] =
    useState("");

  const [valorPlano, setValorPlano] =
    useState("");

  const [periodicidade, setPeriodicidade] =
    useState<Periodicidade>("mensal");

  const [servicos, setServicos] =
    useState<Servico[]>([]);

  const [servicosSelecionados, setServicosSelecionados] =
    useState<ServicoSelecionado[]>([]);

  const [carregandoServicos, setCarregandoServicos] =
    useState(false);

  const [erroFormulario, setErroFormulario] =
    useState("");

  /* =====================================================
     FORMULÁRIO — ADICIONAR CLIENTE
  ===================================================== */

  const [mostrarModalCliente, setMostrarModalCliente] =
    useState(false);

  const [planoSelecionadoCliente, setPlanoSelecionadoCliente] =
    useState<PlanoComClientes | null>(null);

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [clienteSelecionado, setClienteSelecionado] =
    useState("");

  const [dataInicio, setDataInicio] =
    useState("");

  const [dataVencimento, setDataVencimento] =
    useState("");

  const [valorAssinatura, setValorAssinatura] =
    useState("");

  const [observacoesAssinatura, setObservacoesAssinatura] =
    useState("");

  const [carregandoClientes, setCarregandoClientes] =
    useState(false);

  const [salvandoCliente, setSalvandoCliente] =
    useState(false);

  const [erroCliente, setErroCliente] =
    useState("");

  /* =====================================================
     DETALHES DO PLANO
  ===================================================== */

  const [mostrarDetalhes, setMostrarDetalhes] =
    useState(false);

  const [planoDetalhes, setPlanoDetalhes] =
    useState<PlanoComClientes | null>(null);

  const [assinaturas, setAssinaturas] =
    useState<Assinatura[]>([]);

  const [cobrancas, setCobrancas] =
    useState<Cobranca[]>([]);

  const [carregandoDetalhes, setCarregandoDetalhes] =
    useState(false);

  const [buscaClienteDetalhes, setBuscaClienteDetalhes] =
    useState("");

  const [assinaturaAberta, setAssinaturaAberta] =
    useState<string | null>(null);

  const podeEditar =
    tipoUsuario === "dono";

  /* =====================================================
     CARREGAR PLANOS
  ===================================================== */

  async function carregarPlanos() {
    setCarregando(true);
    setMensagem("");

    const {
      barbearia,
      error: erroBarbearia,
      tipoUsuario: tipoUsuarioAtual,
      cargo: cargoAtual,
    } = await getBarbeariaDoUsuario();

    if (erroBarbearia || !barbearia) {
      console.error(
        "Erro ao encontrar barbearia:",
        erroBarbearia
      );

      setMensagem(
        "Não foi possível encontrar sua barbearia."
      );

      setCarregando(false);
      return;
    }

    setBarbeariaId(barbearia.id);
    setTipoUsuario(tipoUsuarioAtual);
    setCargo(cargoAtual);

    const {
      data: planosData,
      error: planosError,
    } = await supabase
      .from("planos")
      .select(`
        id,
        nome,
        descricao,
        valor,
        periodicidade,
        ativo,
        criado_em
      `)
      .eq("barbearia_id", barbearia.id)
      .order("criado_em", {
        ascending: false,
      });

    if (planosError) {
      console.error(
        "Erro ao carregar planos:",
        planosError
      );

      setMensagem(
        "Não foi possível carregar os planos."
      );

      setCarregando(false);
      return;
    }

    const planosComClientes:
      PlanoComClientes[] =
      await Promise.all(
        (planosData || []).map(
          async (plano) => {
            const {
              count,
              error,
            } = await supabase
              .from("assinaturas_planos")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("plano_id", plano.id)
              .neq(
                "status",
                "cancelado"
              )
              .neq(
                "status",
                "encerrado"
              );

            if (error) {
              console.error(
                `Erro ao contar clientes do plano ${plano.nome}:`,
                error
              );
            }

            return {
              ...plano,
              quantidadeClientes:
                count || 0,
            };
          }
        )
      );

    setPlanos(planosComClientes);
    setCarregando(false);
  }

  /* =====================================================
     CARREGAR SERVIÇOS
  ===================================================== */

  async function carregarServicos() {
    if (!barbeariaId) {
      return;
    }

    setCarregandoServicos(true);

    const {
      data,
      error,
    } = await supabase
      .from("servicos")
      .select("id, nome")
      .eq(
        "barbearia_id",
        barbeariaId
      )
      .order("nome", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao carregar serviços:",
        error
      );

      setErroFormulario(
        "Não foi possível carregar os serviços."
      );

      setCarregandoServicos(false);
      return;
    }

    setServicos(data || []);
    setCarregandoServicos(false);
  }

  /* =====================================================
     CARREGAR CLIENTES
  ===================================================== */

  async function carregarClientes() {
    if (!barbeariaId) {
      return;
    }

    setCarregandoClientes(true);
    setErroCliente("");

    const {
      data,
      error,
    } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq(
        "barbearia_id",
        barbeariaId
      )
      .order("nome", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao carregar clientes:",
        error
      );

      setErroCliente(
        "Não foi possível carregar os clientes."
      );

      setCarregandoClientes(false);
      return;
    }

    setClientes(data || []);
    setCarregandoClientes(false);
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  /* =====================================================
     BUSCA
  ===================================================== */

  const planosFiltrados = useMemo(() => {
    const termo =
      busca
        .trim()
        .toLowerCase();

    if (!termo) {
      return planos;
    }

    return planos.filter(
      (plano) =>
        plano.nome
          .toLowerCase()
          .includes(termo) ||
        plano.descricao
          ?.toLowerCase()
          .includes(termo)
    );
  }, [planos, busca]);

  /* =====================================================
     RESUMO
  ===================================================== */

  const totalPlanos =
    planos.length;

  const planosAtivos =
    planos.filter(
      (plano) => plano.ativo
    ).length;

  const planosInativos =
    planos.filter(
      (plano) => !plano.ativo
    ).length;

  const totalClientes =
    planos.reduce(
      (total, plano) =>
        total +
        plano.quantidadeClientes,
      0
    );

  /* =====================================================
     FORMATAÇÕES
  ===================================================== */

  function formatarMoeda(valor: number) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function formatarPeriodicidade(
    periodicidade: Periodicidade
  ) {
    const nomes = {
      mensal: "mês",
      trimestral: "trimestre",
      semestral: "semestre",
      anual: "ano",
    };

    return nomes[periodicidade];
  }

  function formatarData(
    data: string | null
  ) {
    if (!data) {
      return "—";
    }

    const [ano, mes, dia] =
      data.split("-");

    if (!ano || !mes || !dia) {
      return data;
    }

    return `${dia}/${mes}/${ano}`;
  }

  /* =====================================================
     DATA ATUAL
  ===================================================== */

  function obterDataAtual() {
    const hoje = new Date();

    const ano =
      hoje.getFullYear();

    const mes =
      String(
        hoje.getMonth() + 1
      ).padStart(2, "0");

    const dia =
      String(
        hoje.getDate()
      ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  /* =====================================================
     CALCULAR VENCIMENTO
  ===================================================== */

  function calcularVencimento(
    data: string,
    periodicidadePlano: Periodicidade
  ) {
    if (!data) {
      return "";
    }

    const partes =
      data.split("-");

    if (partes.length !== 3) {
      return "";
    }

    const dataBase = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    switch (periodicidadePlano) {
      case "mensal":
        dataBase.setMonth(
          dataBase.getMonth() + 1
        );
        break;

      case "trimestral":
        dataBase.setMonth(
          dataBase.getMonth() + 3
        );
        break;

      case "semestral":
        dataBase.setMonth(
          dataBase.getMonth() + 6
        );
        break;

      case "anual":
        dataBase.setFullYear(
          dataBase.getFullYear() + 1
        );
        break;
    }

    const ano =
      dataBase.getFullYear();

    const mes =
      String(
        dataBase.getMonth() + 1
      ).padStart(2, "0");

    const dia =
      String(
        dataBase.getDate()
      ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  /* =====================================================
     ABRIR NOVO PLANO
  ===================================================== */

  async function abrirNovoPlano() {
    if (!podeEditar) {
      return;
    }

    setNomePlano("");
    setDescricaoPlano("");
    setValorPlano("");
    setPeriodicidade("mensal");
    setServicosSelecionados([]);
    setErroFormulario("");
    setMostrarModal(true);

    if (servicos.length === 0) {
      await carregarServicos();
    }
  }

  function fecharModal() {
    if (salvando) {
      return;
    }

    setMostrarModal(false);
    setErroFormulario("");
  }

  /* =====================================================
     SERVIÇOS
  ===================================================== */

  function alternarServico(
    servicoId: string
  ) {
    setServicosSelecionados(
      (atuais) => {
        const existe =
          atuais.some(
            (item) =>
              item.servicoId ===
              servicoId
          );

        if (existe) {
          return atuais.filter(
            (item) =>
              item.servicoId !==
              servicoId
          );
        }

        return [
          ...atuais,
          {
            servicoId,
            quantidade: 1,
          },
        ];
      }
    );
  }

  function alterarQuantidadeServico(
    servicoId: string,
    quantidade: number
  ) {
    const quantidadeFinal =
      Math.max(
        1,
        Math.floor(
          Number(quantidade) || 1
        )
      );

    setServicosSelecionados(
      (atuais) =>
        atuais.map(
          (item) =>
            item.servicoId ===
            servicoId
              ? {
                  ...item,
                  quantidade:
                    quantidadeFinal,
                }
              : item
        )
    );
  }

  function servicoSelecionado(
    servicoId: string
  ) {
    return servicosSelecionados.find(
      (item) =>
        item.servicoId ===
        servicoId
    );
  }

  /* =====================================================
     CRIAR PLANO
  ===================================================== */

  async function criarPlano(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!podeEditar) {
      setErroFormulario(
        "Somente o dono pode criar planos."
      );
      return;
    }

    if (!barbeariaId) {
      setErroFormulario(
        "Barbearia não encontrada."
      );
      return;
    }

    const nome =
      nomePlano.trim();

    if (!nome) {
      setErroFormulario(
        "Digite o nome do plano."
      );
      return;
    }

    const valorNumerico =
      Number(
        valorPlano.replace(",", ".")
      );

    if (
      !valorPlano ||
      Number.isNaN(valorNumerico) ||
      valorNumerico < 0
    ) {
      setErroFormulario(
        "Digite um valor válido para o plano."
      );
      return;
    }

    if (
      servicosSelecionados.length ===
      0
    ) {
      setErroFormulario(
        "Selecione pelo menos um serviço para o plano."
      );
      return;
    }

    setSalvando(true);
    setErroFormulario("");

    const {
      data: novoPlano,
      error: erroPlano,
    } = await supabase
      .from("planos")
      .insert({
        barbearia_id:
          barbeariaId,
        nome,
        descricao:
          descricaoPlano.trim() ||
          null,
        valor:
          valorNumerico,
        periodicidade,
        ativo: true,
      })
      .select(
        "id, nome, descricao, valor, periodicidade, ativo, criado_em"
      )
      .single();

    if (
      erroPlano ||
      !novoPlano
    ) {
      console.error(
        "Erro ao criar plano:",
        erroPlano
      );

      setErroFormulario(
        "Não foi possível criar o plano."
      );

      setSalvando(false);
      return;
    }

    const servicosParaInserir =
      servicosSelecionados.map(
        (item) => ({
          plano_id:
            novoPlano.id,
          servico_id:
            item.servicoId,
          quantidade:
            item.quantidade,
        })
      );

    const {
      error: erroServicos,
    } = await supabase
      .from("plano_servicos")
      .insert(
        servicosParaInserir
      );

    if (erroServicos) {
      console.error(
        "Erro ao adicionar serviços ao plano:",
        erroServicos
      );

      await supabase
        .from("planos")
        .delete()
        .eq(
          "id",
          novoPlano.id
        );

      setErroFormulario(
        "Não foi possível adicionar os serviços ao plano."
      );

      setSalvando(false);
      return;
    }

    setMostrarModal(false);
    setNomePlano("");
    setDescricaoPlano("");
    setValorPlano("");
    setPeriodicidade("mensal");
    setServicosSelecionados([]);
    setErroFormulario("");
    setSalvando(false);

    await carregarPlanos();
  }

  /* =====================================================
     ABRIR MODAL — ADICIONAR CLIENTE
  ===================================================== */

  async function abrirModalAdicionarCliente(
    plano: PlanoComClientes
  ) {
    if (!podeEditar) {
      return;
    }

    const hoje =
      obterDataAtual();

    setPlanoSelecionadoCliente(
      plano
    );

    setClienteSelecionado("");
    setDataInicio(hoje);

    setDataVencimento(
      calcularVencimento(
        hoje,
        plano.periodicidade
      )
    );

    setValorAssinatura(
      String(
        Number(plano.valor)
      ).replace(".", ",")
    );

    setObservacoesAssinatura("");
    setErroCliente("");
    setMostrarModalCliente(true);

    if (clientes.length === 0) {
      await carregarClientes();
    }
  }

  function fecharModalCliente() {
    if (salvandoCliente) {
      return;
    }

    setMostrarModalCliente(false);
    setPlanoSelecionadoCliente(null);
    setClienteSelecionado("");
    setDataInicio("");
    setDataVencimento("");
    setValorAssinatura("");
    setObservacoesAssinatura("");
    setErroCliente("");
  }

  function alterarDataInicio(
    data: string
  ) {
    setDataInicio(data);

    if (
      planoSelecionadoCliente
    ) {
      setDataVencimento(
        calcularVencimento(
          data,
          planoSelecionadoCliente.periodicidade
        )
      );
    }
  }

  /* =====================================================
     ADICIONAR CLIENTE
  ===================================================== */

  async function adicionarClienteAoPlano(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!podeEditar) {
      setErroCliente(
        "Somente o dono pode adicionar clientes aos planos."
      );
      return;
    }

    if (
      !barbeariaId ||
      !planoSelecionadoCliente
    ) {
      setErroCliente(
        "Não foi possível identificar o plano ou a barbearia."
      );
      return;
    }

    if (!clienteSelecionado) {
      setErroCliente(
        "Selecione um cliente."
      );
      return;
    }

    if (!dataInicio) {
      setErroCliente(
        "Informe a data de início."
      );
      return;
    }

    if (!dataVencimento) {
      setErroCliente(
        "Informe a data de vencimento."
      );
      return;
    }

    const valorNumerico =
      Number(
        valorAssinatura.replace(",", ".")
      );

    if (
      !valorAssinatura ||
      Number.isNaN(valorNumerico) ||
      valorNumerico < 0
    ) {
      setErroCliente(
        "Digite um valor válido para a assinatura."
      );
      return;
    }

    setSalvandoCliente(true);
    setErroCliente("");

    const {
      data: novaAssinatura,
      error: erroAssinatura,
    } = await supabase
      .from("assinaturas_planos")
      .insert({
        barbearia_id:
          barbeariaId,
        plano_id:
          planoSelecionadoCliente.id,
        cliente_id:
          clienteSelecionado,
        data_inicio:
          dataInicio,
        data_vencimento:
          dataVencimento,
        valor:
          valorNumerico,
        status:
          "ativo",
        observacoes:
          observacoesAssinatura.trim() ||
          null,
      })
      .select("id")
      .single();

    if (
      erroAssinatura ||
      !novaAssinatura
    ) {
      console.error(
        "Erro ao criar assinatura:",
        erroAssinatura
      );

      if (
        erroAssinatura?.code ===
        "23505"
      ) {
        setErroCliente(
          "Este cliente já possui uma assinatura ativa deste plano."
        );
      } else {
        setErroCliente(
          "Não foi possível adicionar o cliente ao plano."
        );
      }

      setSalvandoCliente(false);
      return;
    }

    const {
      error: erroCobranca,
    } = await supabase
      .from("cobrancas_planos")
      .insert({
        assinatura_id:
          novaAssinatura.id,
        barbearia_id:
          barbeariaId,
        cliente_id:
          clienteSelecionado,
        plano_id:
          planoSelecionadoCliente.id,
        valor:
          valorNumerico,
        data_vencimento:
          dataVencimento,
        status:
          "pendente",
        descricao:
          `Cobrança do plano ${planoSelecionadoCliente.nome}`,
      });

    if (erroCobranca) {
      console.error(
        "Erro ao criar cobrança:",
        erroCobranca
      );

      await supabase
        .from("assinaturas_planos")
        .delete()
        .eq(
          "id",
          novaAssinatura.id
        );

      setErroCliente(
        "Não foi possível criar a primeira cobrança da assinatura."
      );

      setSalvandoCliente(false);
      return;
    }

    setMostrarModalCliente(false);
    setPlanoSelecionadoCliente(null);
    setClienteSelecionado("");
    setDataInicio("");
    setDataVencimento("");
    setValorAssinatura("");
    setObservacoesAssinatura("");
    setErroCliente("");
    setSalvandoCliente(false);

    await carregarPlanos();
  }

  /* =====================================================
     ABRIR DETALHES
  ===================================================== */

  async function abrirDetalhes(
    plano: PlanoComClientes
  ) {
    if (!barbeariaId) {
      return;
    }

    setPlanoDetalhes(plano);
    setMostrarDetalhes(true);
    setCarregandoDetalhes(true);
    setAssinaturas([]);
    setCobrancas([]);
    setBuscaClienteDetalhes("");
    setAssinaturaAberta(null);

    const {
      data: assinaturasData,
      error: erroAssinaturas,
    } = await supabase
      .from("assinaturas_planos")
      .select(`
        id,
        cliente_id,
        data_inicio,
        data_vencimento,
        valor,
        status,
        observacoes
      `)
      .eq(
        "plano_id",
        plano.id
      )
      .order(
        "data_vencimento",
        {
          ascending: true,
        }
      );

    if (erroAssinaturas) {
      console.error(
        "Erro ao carregar assinaturas:",
        erroAssinaturas
      );

      setCarregandoDetalhes(false);
      return;
    }

    const clienteIds =
      (assinaturasData || []).map(
        (item) =>
          item.cliente_id
      );

    let clientesMap =
      new Map<string, string>();

    if (clienteIds.length > 0) {
      const {
        data: clientesData,
        error: erroClientes,
      } = await supabase
        .from("clientes")
        .select("id, nome")
        .in(
          "id",
          clienteIds
        );

      if (erroClientes) {
        console.error(
          "Erro ao carregar nomes dos clientes:",
          erroClientes
        );
      }

      (clientesData || []).forEach(
        (cliente) => {
          clientesMap.set(
            cliente.id,
            cliente.nome
          );
        }
      );
    }

    const assinaturasFormatadas:
      Assinatura[] =
      (assinaturasData || []).map(
        (assinatura) => ({
          ...assinatura,
          valor: Number(
            assinatura.valor
          ),
          clienteNome:
            clientesMap.get(
              assinatura.cliente_id
            ) ||
            "Cliente não encontrado",
        })
      );

    setAssinaturas(
      assinaturasFormatadas
    );

    const assinaturaIds =
      assinaturasFormatadas.map(
        (item) => item.id
      );

    if (assinaturaIds.length > 0) {
      const {
        data: cobrancasData,
        error: erroCobrancas,
      } = await supabase
        .from("cobrancas_planos")
        .select(`
          id,
          assinatura_id,
          valor,
          data_vencimento,
          data_pagamento,
          forma_pagamento,
          status,
          descricao
        `)
        .in(
          "assinatura_id",
          assinaturaIds
        )
        .order(
          "data_vencimento",
          {
            ascending: false,
          }
        );

      if (erroCobrancas) {
        console.error(
          "Erro ao carregar cobranças:",
          erroCobrancas
        );
      }

      setCobrancas(
        (cobrancasData || []).map(
          (cobranca) => ({
            ...cobranca,
            valor: Number(
              cobranca.valor
            ),
          })
        )
      );
    }

    setCarregandoDetalhes(false);
  }

  function fecharDetalhes() {
    if (carregandoDetalhes) {
      return;
    }

    setMostrarDetalhes(false);
    setPlanoDetalhes(null);
    setAssinaturas([]);
    setCobrancas([]);
    setAssinaturaAberta(null);
  }

  /* =====================================================
     FILTRO DE CLIENTES
  ===================================================== */

  const assinaturasFiltradas =
    useMemo(() => {
      const termo =
        buscaClienteDetalhes
          .trim()
          .toLowerCase();

      if (!termo) {
        return assinaturas;
      }

      return assinaturas.filter(
        (assinatura) =>
          assinatura.clienteNome
            .toLowerCase()
            .includes(termo)
      );
    }, [
      assinaturas,
      buscaClienteDetalhes,
    ]);

  /* =====================================================
     MÉTRICAS DOS DETALHES
  ===================================================== */

  const assinaturasAtivas =
    assinaturas.filter(
      (item) =>
        item.status === "ativo"
    ).length;

  const assinaturasVencendo =
    assinaturas.filter(
      (item) =>
        item.status === "vencendo"
    ).length;

  const assinaturasInadimplentes =
    assinaturas.filter(
      (item) =>
        item.status ===
        "inadimplente"
    ).length;

  const receitaAssinaturas =
    assinaturas
      .filter(
        (item) =>
          item.status === "ativo" ||
          item.status === "vencendo" ||
          item.status ===
            "inadimplente"
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

  function cobrancasDaAssinatura(
    assinaturaId: string
  ) {
    return cobrancas.filter(
      (cobranca) =>
        cobranca.assinatura_id ===
        assinaturaId
    );
  }

  function classeStatusAssinatura(
    status: Assinatura["status"]
  ) {
    switch (status) {
      case "ativo":
        return "bg-emerald-500/10 text-emerald-400";

      case "vencendo":
        return "bg-yellow-500/10 text-yellow-400";

      case "inadimplente":
        return "bg-red-500/10 text-red-400";

      case "cancelado":
        return "bg-zinc-800 text-zinc-400";

      case "encerrado":
        return "bg-zinc-800 text-zinc-500";

      default:
        return "bg-zinc-800 text-zinc-400";
    }
  }

  function nomeStatusAssinatura(
    status: Assinatura["status"]
  ) {
    const nomes = {
      ativo: "Ativo",
      vencendo: "Vencendo",
      inadimplente: "Inadimplente",
      cancelado: "Cancelado",
      encerrado: "Encerrado",
    };

    return nomes[status];
  }

  function classeStatusCobranca(
    status: Cobranca["status"]
  ) {
    switch (status) {
      case "pago":
        return "bg-emerald-500/10 text-emerald-400";

      case "pendente":
        return "bg-yellow-500/10 text-yellow-400";

      case "atrasado":
        return "bg-red-500/10 text-red-400";

      case "cancelado":
        return "bg-zinc-800 text-zinc-400";

      default:
        return "bg-zinc-800 text-zinc-400";
    }
  }

  function nomeStatusCobranca(
    status: Cobranca["status"]
  ) {
    const nomes = {
      pago: "Pago",
      pendente: "Pendente",
      atrasado: "Atrasado",
      cancelado: "Cancelado",
    };

    return nomes[status];
  }

  /* =====================================================
     INTERFACE
  ===================================================== */

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-8">

      <div className="max-w-7xl mx-auto">

        {/* CABEÇALHO */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Planos
            </h1>

            <p className="text-zinc-400 mt-1">
              Crie e gerencie os planos oferecidos pela
              barbearia.
            </p>

            {tipoUsuario === "membro" && (
              <p className="text-sm text-zinc-500 mt-2">
                {cargo || "Membro"} • Somente visualização
              </p>
            )}
          </div>

          {podeEditar && (
            <button
              onClick={abrirNovoPlano}
              className="w-full sm:w-auto bg-white text-black px-5 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
            >
              + Novo Plano
            </button>
          )}

        </div>

        {/* MENSAGEM */}

        {mensagem && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-300">
            {mensagem}
          </div>
        )}

        {/* RESUMO */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">
              Total de planos
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalPlanos}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">
              Planos ativos
            </p>

            <p className="text-3xl font-bold mt-2 text-emerald-400">
              {planosAtivos}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">
              Planos inativos
            </p>

            <p className="text-3xl font-bold mt-2 text-zinc-500">
              {planosInativos}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">
              Clientes em planos
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalClientes}
            </p>
          </div>

        </div>

        {/* BUSCA */}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar plano..."
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
        </div>

        {/* PLANOS */}

        {carregando ? (

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">
              Carregando planos...
            </p>
          </div>

        ) : planosFiltrados.length === 0 ? (

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">

            <div className="text-5xl mb-4">
              📋
            </div>

            <h2 className="text-xl font-semibold">
              {busca
                ? "Nenhum plano encontrado"
                : "Nenhum plano criado"}
            </h2>

            <p className="text-zinc-400 mt-2">
              {busca
                ? "Tente buscar por outro nome."
                : "Crie o primeiro plano da sua barbearia."}
            </p>

            {podeEditar && !busca && (
              <button
                onClick={abrirNovoPlano}
                className="mt-6 bg-white text-black px-5 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
              >
                + Criar primeiro plano
              </button>
            )}

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

            {planosFiltrados.map(
              (plano) => (

                <div
                  key={plano.id}
                  className={`bg-zinc-900 border rounded-2xl p-6 transition ${
                    plano.ativo
                      ? "border-zinc-800 hover:border-zinc-700"
                      : "border-zinc-900 opacity-70"
                  }`}
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <h2 className="text-xl font-bold">
                        {plano.nome}
                      </h2>

                      <span
                        className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                          plano.ativo
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {plano.ativo
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>

                  </div>

                  {plano.descricao && (
                    <p className="text-sm text-zinc-400 mt-4 line-clamp-2">
                      {plano.descricao}
                    </p>
                  )}

                  <div className="mt-6">

                    <span className="text-3xl font-bold">
                      {formatarMoeda(
                        Number(plano.valor)
                      )}
                    </span>

                    <span className="text-zinc-500 ml-2">
                      /{" "}
                      {formatarPeriodicidade(
                        plano.periodicidade
                      )}
                    </span>

                  </div>

                  <div className="mt-5 pt-5 border-t border-zinc-800">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-zinc-400">
                        Clientes vinculados
                      </span>

                      <span className="font-semibold">
                        {plano.quantidadeClientes}
                      </span>

                    </div>

                  </div>

                  <div className="mt-5 flex flex-col gap-2">

                    {podeEditar && (
                      <button
                        onClick={() =>
                          abrirModalAdicionarCliente(
                            plano
                          )
                        }
                        disabled={!plano.ativo}
                        className="w-full bg-white text-black rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + Adicionar cliente
                      </button>
                    )}

                    <div className="flex gap-2">

                      <button
                        onClick={() =>
                          abrirDetalhes(plano)
                        }
                        className="flex-1 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 transition"
                      >
                        Ver detalhes
                      </button>

                      {podeEditar && (
                        <button
                          className="border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 transition"
                        >
                          Editar
                        </button>
                      )}

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

        {/* =================================================
            MODAL — NOVO PLANO
        ================================================= */}

        {mostrarModal && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                fecharModal();
              }
            }}
          >

            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">

              <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-6 py-5 flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-bold">
                    Novo plano
                  </h2>

                  <p className="text-sm text-zinc-400 mt-1">
                    Configure o plano oferecido aos clientes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="text-zinc-400 hover:text-white text-2xl transition disabled:opacity-50"
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={criarPlano}
                className="p-6 space-y-6"
              >

                {erroFormulario && (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    {erroFormulario}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nome do plano *
                  </label>

                  <input
                    type="text"
                    value={nomePlano}
                    onChange={(e) =>
                      setNomePlano(e.target.value)
                    }
                    placeholder="Ex.: Plano Black"
                    maxLength={100}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Descrição
                  </label>

                  <textarea
                    value={descricaoPlano}
                    onChange={(e) =>
                      setDescricaoPlano(
                        e.target.value
                      )
                    }
                    placeholder="Ex.: Ideal para quem corta o cabelo toda semana."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Valor *
                    </label>

                    <div className="relative">

                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        R$
                      </span>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorPlano}
                        onChange={(e) =>
                          setValorPlano(
                            e.target.value.replace(
                              /[^0-9,.]/g,
                              ""
                            )
                          )
                        }
                        placeholder="99,90"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                      />

                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Periodicidade *
                    </label>

                    <select
                      value={periodicidade}
                      onChange={(e) =>
                        setPeriodicidade(
                          e.target.value as Periodicidade
                        )
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-zinc-600"
                    >
                      <option value="mensal">
                        Mensal
                      </option>

                      <option value="trimestral">
                        Trimestral
                      </option>

                      <option value="semestral">
                        Semestral
                      </option>

                      <option value="anual">
                        Anual
                      </option>
                    </select>
                  </div>

                </div>

                <div>

                  <div className="flex items-center justify-between mb-3">

                    <div>
                      <label className="block text-sm font-medium text-zinc-300">
                        Serviços do plano *
                      </label>

                      <p className="text-xs text-zinc-500 mt-1">
                        Escolha os serviços e quantas vezes poderão ser utilizados.
                      </p>
                    </div>

                    {servicosSelecionados.length > 0 && (
                      <span className="text-xs text-zinc-400">
                        {servicosSelecionados.length} selecionado
                        {servicosSelecionados.length !== 1
                          ? "s"
                          : ""}
                      </span>
                    )}

                  </div>

                  {carregandoServicos ? (

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
                      <p className="text-sm text-zinc-400">
                        Carregando serviços...
                      </p>
                    </div>

                  ) : servicos.length === 0 ? (

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">

                      <div className="text-3xl mb-2">
                        ✂️
                      </div>

                      <p className="text-sm font-medium">
                        Nenhum serviço cadastrado
                      </p>

                      <p className="text-xs text-zinc-500 mt-1">
                        Cadastre pelo menos um serviço antes de criar um plano.
                      </p>

                    </div>

                  ) : (

                    <div className="space-y-2">

                      {servicos.map(
                        (servico) => {

                          const selecionado =
                            servicoSelecionado(
                              servico.id
                            );

                          return (
                            <div
                              key={servico.id}
                              className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
                                selecionado
                                  ? "border-zinc-600 bg-zinc-800/70"
                                  : "border-zinc-800 bg-zinc-950"
                              }`}
                            >

                              <label className="flex items-center gap-3 cursor-pointer min-w-0">

                                <input
                                  type="checkbox"
                                  checked={!!selecionado}
                                  onChange={() =>
                                    alternarServico(
                                      servico.id
                                    )
                                  }
                                  className="w-4 h-4 accent-white cursor-pointer"
                                />

                                <span className="text-sm font-medium truncate">
                                  {servico.nome}
                                </span>

                              </label>

                              {selecionado && (

                                <div className="flex items-center gap-2 shrink-0">

                                  <span className="text-xs text-zinc-500">
                                    Quantidade
                                  </span>

                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                      selecionado.quantidade
                                    }
                                    onChange={(e) =>
                                      alterarQuantidadeServico(
                                        servico.id,
                                        Number(
                                          e.target.value
                                        )
                                      )
                                    }
                                    className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-center text-sm outline-none focus:border-zinc-500"
                                  />

                                </div>

                              )}

                            </div>
                          );
                        }
                      )}

                    </div>

                  )}

                </div>

                {(nomePlano.trim() ||
                  valorPlano) && (

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">

                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
                      Pré-visualização
                    </p>

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h3 className="font-semibold">
                          {nomePlano.trim() ||
                            "Nome do plano"}
                        </h3>

                        <p className="text-xs text-zinc-500 mt-1">
                          {formatarPeriodicidade(
                            periodicidade
                          )}
                        </p>
                      </div>

                      <p className="text-lg font-bold">
                        {valorPlano
                          ? formatarMoeda(
                              Number(
                                valorPlano.replace(
                                  ",",
                                  "."
                                )
                              ) || 0
                            )
                          : "R$ 0,00"}
                      </p>

                    </div>

                  </div>

                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">

                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={salvando}
                    className="flex-1 border border-zinc-700 rounded-xl px-4 py-3 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvando ||
                      servicos.length === 0
                    }
                    className="flex-1 bg-white text-black rounded-xl px-4 py-3 font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {salvando
                      ? "Criando plano..."
                      : "Criar plano"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

        {/* =================================================
            MODAL — ADICIONAR CLIENTE
        ================================================= */}

        {mostrarModalCliente && (

          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                fecharModalCliente();
              }
            }}
          >

            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">

              <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-6 py-5 flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-bold">
                    Adicionar cliente
                  </h2>

                  <p className="text-sm text-zinc-400 mt-1">
                    Vincule um cliente ao plano.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalCliente}
                  disabled={salvandoCliente}
                  className="text-zinc-400 hover:text-white text-2xl transition disabled:opacity-50"
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={adicionarClienteAoPlano}
                className="p-6 space-y-5"
              >

                {erroCliente && (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    {erroCliente}
                  </div>
                )}

                {planoSelecionadoCliente && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Plano selecionado
                    </p>

                    <div className="flex items-center justify-between gap-4 mt-2">

                      <div>
                        <p className="font-semibold">
                          {
                            planoSelecionadoCliente.nome
                          }
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          Plano{" "}
                          {formatarPeriodicidade(
                            planoSelecionadoCliente.periodicidade
                          )}
                        </p>
                      </div>

                      <p className="font-bold">
                        {formatarMoeda(
                          Number(
                            planoSelecionadoCliente.valor
                          )
                        )}
                      </p>

                    </div>

                  </div>
                )}

                <div>

                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Cliente *
                  </label>

                  {carregandoClientes ? (

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                      Carregando clientes...
                    </div>

                  ) : clientes.length === 0 ? (

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

                      <p className="text-sm font-medium">
                        Nenhum cliente cadastrado
                      </p>

                      <p className="text-xs text-zinc-500 mt-1">
                        Cadastre um cliente antes de vinculá-lo a um plano.
                      </p>

                    </div>

                  ) : (

                    <select
                      value={clienteSelecionado}
                      onChange={(e) =>
                        setClienteSelecionado(
                          e.target.value
                        )
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-zinc-600"
                    >

                      <option value="">
                        Selecione um cliente
                      </option>

                      {clientes.map(
                        (cliente) => (
                          <option
                            key={cliente.id}
                            value={cliente.id}
                          >
                            {cliente.nome}
                          </option>
                        )
                      )}

                    </select>

                  )}

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Data de início *
                    </label>

                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) =>
                        alterarDataInicio(
                          e.target.value
                        )
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-zinc-600"
                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Primeiro vencimento *
                    </label>

                    <input
                      type="date"
                      value={dataVencimento}
                      onChange={(e) =>
                        setDataVencimento(
                          e.target.value
                        )
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-zinc-600"
                    />

                  </div>

                </div>

                <div>

                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Valor da assinatura *
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      R$
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorAssinatura}
                      onChange={(e) =>
                        setValorAssinatura(
                          e.target.value.replace(
                            /[^0-9,.]/g,
                            ""
                          )
                        )
                      }
                      placeholder="99,90"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                    />

                  </div>

                  <p className="text-xs text-zinc-500 mt-2">
                    O valor pode ser diferente do valor padrão do plano.
                  </p>

                </div>

                <div>

                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Observações
                  </label>

                  <textarea
                    value={observacoesAssinatura}
                    onChange={(e) =>
                      setObservacoesAssinatura(
                        e.target.value
                      )
                    }
                    placeholder="Ex.: Cliente recebeu condição especial."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-zinc-600 resize-none"
                  />

                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">

                  <button
                    type="button"
                    onClick={fecharModalCliente}
                    disabled={salvandoCliente}
                    className="flex-1 border border-zinc-700 rounded-xl px-4 py-3 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvandoCliente ||
                      carregandoClientes ||
                      clientes.length === 0
                    }
                    className="flex-1 bg-white text-black rounded-xl px-4 py-3 font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {salvandoCliente
                      ? "Adicionando..."
                      : "Adicionar cliente"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

        {/* =================================================
            MODAL — DETALHES DO PLANO
        ================================================= */}

        {mostrarDetalhes && planoDetalhes && (

          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                fecharDetalhes();
              }
            }}
          >

            <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">

              {/* CABEÇALHO */}

              <div className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 px-6 py-5">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <div className="flex items-center gap-3 flex-wrap">

                      <h2 className="text-2xl font-bold">
                        {planoDetalhes.nome}
                      </h2>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          planoDetalhes.ativo
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {planoDetalhes.ativo
                          ? "Ativo"
                          : "Inativo"}
                      </span>

                    </div>

                    {planoDetalhes.descricao && (
                      <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                        {planoDetalhes.descricao}
                      </p>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={fecharDetalhes}
                    disabled={carregandoDetalhes}
                    className="text-zinc-400 hover:text-white text-2xl transition disabled:opacity-50"
                  >
                    ×
                  </button>

                </div>

              </div>

              <div className="p-6">

                {carregandoDetalhes ? (

                  <div className="py-16 text-center">

                    <div className="text-4xl mb-4">
                      ⏳
                    </div>

                    <p className="text-zinc-400">
                      Carregando detalhes do plano...
                    </p>

                  </div>

                ) : (

                  <>

                    {/* INFORMAÇÕES DO PLANO */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                        <p className="text-xs text-zinc-500">
                          Valor do plano
                        </p>

                        <p className="text-xl font-bold mt-2">
                          {formatarMoeda(
                            Number(
                              planoDetalhes.valor
                            )
                          )}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          /{" "}
                          {formatarPeriodicidade(
                            planoDetalhes.periodicidade
                          )}
                        </p>

                      </div>

                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                        <p className="text-xs text-zinc-500">
                          Clientes ativos
                        </p>

                        <p className="text-2xl font-bold mt-2 text-emerald-400">
                          {assinaturasAtivas}
                        </p>

                      </div>

                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                        <p className="text-xs text-zinc-500">
                          Vencendo
                        </p>

                        <p className="text-2xl font-bold mt-2 text-yellow-400">
                          {assinaturasVencendo}
                        </p>

                      </div>

                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

                        <p className="text-xs text-zinc-500">
                          Inadimplentes
                        </p>

                        <p className="text-2xl font-bold mt-2 text-red-400">
                          {assinaturasInadimplentes}
                        </p>

                      </div>

                    </div>

                    {/* RECEITA */}

                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-8">

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <div>

                          <p className="text-sm text-zinc-400">
                            Receita recorrente das assinaturas
                          </p>

                          <p className="text-3xl font-bold mt-1">
                            {formatarMoeda(
                              receitaAssinaturas
                            )}
                          </p>

                        </div>

                        <div className="text-sm text-zinc-500">
                          {assinaturas.length} assinatura
                          {assinaturas.length !== 1
                            ? "s"
                            : ""} cadastrada
                          {assinaturas.length !== 1
                            ? "s"
                            : ""}
                        </div>

                      </div>

                    </div>

                    {/* CLIENTES */}

                    <div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">

                        <div>

                          <h3 className="text-lg font-semibold">
                            Clientes do plano
                          </h3>

                          <p className="text-sm text-zinc-500 mt-1">
                            Consulte assinaturas e cobranças.
                          </p>

                        </div>

                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={buscaClienteDetalhes}
                          onChange={(e) =>
                            setBuscaClienteDetalhes(
                              e.target.value
                            )
                          }
                          className="w-full sm:w-64 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                        />

                      </div>

                      {assinaturasFiltradas.length === 0 ? (

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">

                          <div className="text-4xl mb-3">
                            👥
                          </div>

                          <p className="font-medium">
                            {buscaClienteDetalhes
                              ? "Nenhum cliente encontrado"
                              : "Nenhum cliente vinculado"}
                          </p>

                          <p className="text-sm text-zinc-500 mt-1">
                            {buscaClienteDetalhes
                              ? "Tente outro nome."
                              : "Adicione clientes a este plano para acompanhar as assinaturas."}
                          </p>

                        </div>

                      ) : (

                        <div className="space-y-3">

                          {assinaturasFiltradas.map(
                            (assinatura) => {

                              const aberta =
                                assinaturaAberta ===
                                assinatura.id;

                              const cobrancasCliente =
                                cobrancasDaAssinatura(
                                  assinatura.id
                                );

                              return (
                                <div
                                  key={
                                    assinatura.id
                                  }
                                  className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden"
                                >

                                  {/* CLIENTE */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAssinaturaAberta(
                                        aberta
                                          ? null
                                          : assinatura.id
                                      )
                                    }
                                    className="w-full text-left p-4 hover:bg-zinc-900/70 transition"
                                  >

                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                                      <div className="flex items-center gap-3 min-w-0">

                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                          👤
                                        </div>

                                        <div className="min-w-0">

                                          <p className="font-semibold truncate">
                                            {
                                              assinatura.clienteNome
                                            }
                                          </p>

                                          <p className="text-xs text-zinc-500 mt-1">
                                            Início:{" "}
                                            {formatarData(
                                              assinatura.data_inicio
                                            )}
                                          </p>

                                        </div>

                                      </div>

                                      <div className="flex flex-wrap items-center gap-3">

                                        <div className="text-right">

                                          <p className="font-semibold">
                                            {formatarMoeda(
                                              Number(
                                                assinatura.valor
                                              )
                                            )}
                                          </p>

                                          <p className="text-xs text-zinc-500 mt-1">
                                            Vence:{" "}
                                            {formatarData(
                                              assinatura.data_vencimento
                                            )}
                                          </p>

                                        </div>

                                        <span
                                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${classeStatusAssinatura(
                                            assinatura.status
                                          )}`}
                                        >
                                          {nomeStatusAssinatura(
                                            assinatura.status
                                          )}
                                        </span>

                                        <span className="text-zinc-500 text-sm">
                                          {aberta
                                            ? "▲"
                                            : "▼"}
                                        </span>

                                      </div>

                                    </div>

                                  </button>

                                  {/* DETALHES DA ASSINATURA */}

                                  {aberta && (

                                    <div className="border-t border-zinc-800 p-5">

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

                                        <div>
                                          <p className="text-xs text-zinc-500">
                                            Cliente
                                          </p>

                                          <p className="text-sm font-medium mt-1">
                                            {
                                              assinatura.clienteNome
                                            }
                                          </p>
                                        </div>

                                        <div>
                                          <p className="text-xs text-zinc-500">
                                            Data de início
                                          </p>

                                          <p className="text-sm font-medium mt-1">
                                            {formatarData(
                                              assinatura.data_inicio
                                            )}
                                          </p>
                                        </div>

                                        <div>
                                          <p className="text-xs text-zinc-500">
                                            Vencimento
                                          </p>

                                          <p className="text-sm font-medium mt-1">
                                            {formatarData(
                                              assinatura.data_vencimento
                                            )}
                                          </p>
                                        </div>

                                      </div>

                                      {assinatura.observacoes && (
                                        <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900 p-4">

                                          <p className="text-xs text-zinc-500 mb-1">
                                            Observações
                                          </p>

                                          <p className="text-sm text-zinc-300">
                                            {
                                              assinatura.observacoes
                                            }
                                          </p>

                                        </div>
                                      )}

                                      <div>

                                        <div className="flex items-center justify-between mb-3">

                                          <div>
                                            <h4 className="text-sm font-semibold">
                                              Histórico de cobranças
                                            </h4>

                                            <p className="text-xs text-zinc-500 mt-1">
                                              {cobrancasCliente.length} cobrança
                                              {cobrancasCliente.length !== 1
                                                ? "s"
                                                : ""}
                                            </p>
                                          </div>

                                        </div>

                                        {cobrancasCliente.length === 0 ? (

                                          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">

                                            <p className="text-sm text-zinc-500">
                                              Nenhuma cobrança registrada.
                                            </p>

                                          </div>

                                        ) : (

                                          <div className="space-y-2">

                                            {cobrancasCliente.map(
                                              (cobranca) => (

                                                <div
                                                  key={
                                                    cobranca.id
                                                  }
                                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                                                >

                                                  <div>

                                                    <p className="text-sm font-medium">
                                                      {formatarMoeda(
                                                        Number(
                                                          cobranca.valor
                                                        )
                                                      )}
                                                    </p>

                                                    <p className="text-xs text-zinc-500 mt-1">
                                                      Vencimento:{" "}
                                                      {formatarData(
                                                        cobranca.data_vencimento
                                                      )}
                                                    </p>

                                                    {cobranca.data_pagamento && (
                                                      <p className="text-xs text-zinc-500 mt-1">
                                                        Pago em:{" "}
                                                        {formatarData(
                                                          cobranca.data_pagamento
                                                        )}
                                                      </p>
                                                    )}

                                                  </div>

                                                  <div className="flex items-center gap-3">

                                                    {cobranca.forma_pagamento && (
                                                      <span className="text-xs text-zinc-500 capitalize">
                                                        {
                                                          cobranca.forma_pagamento
                                                        }
                                                      </span>
                                                    )}

                                                    <span
                                                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${classeStatusCobranca(
                                                        cobranca.status
                                                      )}`}
                                                    >
                                                      {nomeStatusCobranca(
                                                        cobranca.status
                                                      )}
                                                    </span>

                                                  </div>

                                                </div>

                                              )
                                            )}

                                          </div>

                                        )}

                                      </div>

                                    </div>

                                  )}

                                </div>
                              );
                            }
                          )}

                        </div>

                      )}

                    </div>

                  </>

                )}

              </div>

              {/* RODAPÉ */}

              <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex justify-end">

                <button
                  type="button"
                  onClick={fecharDetalhes}
                  disabled={carregandoDetalhes}
                  className="border border-zinc-700 rounded-xl px-5 py-2.5 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Fechar
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}