import { createClient } from "@/lib/supabase/client";

export type TipoUsuario = "dono" | "membro";

export interface BarbeariaUsuario {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  whatsapp: string | null;
  mensagem_confirmacao: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  descricao: string | null;
  horarios_funcionamento: Record<string, unknown> | null;
}

interface BarbeariaMembro {
  barbearia_id: string;
  cargo: string | null;
  ativo: boolean;
}

export interface ResultadoBarbearia {
  barbearia: BarbeariaUsuario | null;
  tipoUsuario: TipoUsuario | null;
  cargo: string | null;
  error: Error | null;
}

/**
 * Busca a barbearia relacionada ao usuário atualmente logado.
 *
 * Estrutura utilizada pelo projeto:
 *
 * DONO:
 * barbearias.owner_id = auth.users.id
 *
 * MEMBRO:
 * membros_barbearia.user_id = auth.users.id
 * membros_barbearia.barbearia_id = barbearias.id
 *
 * Retorna:
 * {
 *   barbearia,
 *   tipoUsuario,
 *   cargo,
 *   error
 * }
 */
export async function getBarbeariaDoUsuario(): Promise<ResultadoBarbearia> {
  const supabase = createClient();

  // =========================================================
  // 1. PEGAR USUÁRIO LOGADO
  // =========================================================

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario) {
    console.error(
      "Erro ao obter usuário autenticado:",
      errorUsuario.message
    );

    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error(
        errorUsuario.message || "Erro ao obter usuário autenticado."
      ),
    };
  }

  if (!user) {
    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error("Usuário não autenticado."),
    };
  }

  console.log("========================================");
  console.log("BUSCANDO BARBEARIA DO USUÁRIO");
  console.log("Usuário:", user.id);
  console.log("Email:", user.email);
  console.log("========================================");

  // =========================================================
  // 2. VERIFICAR SE O USUÁRIO É DONO
  // =========================================================
  //
  // IMPORTANTE:
  // A coluna correta é owner_id.
  //
  // NÃO usar:
  // .eq("dono_id", user.id)
  //
  // =========================================================

  const {
    data: barbeariaDono,
    error: errorDono,
  } = await supabase
    .from("barbearias")
    .select(`
      id,
      nome,
      logo_url,
      cor_primaria,
      cor_secundaria,
      whatsapp,
      mensagem_confirmacao,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      descricao,
      horarios_funcionamento
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (errorDono) {
    console.error("========================================");
    console.error("ERRO AO BUSCAR BARBEARIA DO DONO");
    console.error("Mensagem:", errorDono.message);
    console.error("Código:", errorDono.code);
    console.error("Detalhes:", errorDono.details);
    console.error("========================================");

    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error(
        errorDono.message || "Erro ao buscar barbearia do dono."
      ),
    };
  }

  // =========================================================
  // 3. BARBEARIA DO DONO ENCONTRADA
  // =========================================================

  if (barbeariaDono) {
    console.log("========================================");
    console.log("BARBEARIA ENCONTRADA COMO DONO");
    console.log("ID:", barbeariaDono.id);
    console.log("Nome:", barbeariaDono.nome);
    console.log("========================================");

    return {
      barbearia: barbeariaDono as BarbeariaUsuario,
      tipoUsuario: "dono",
      cargo: "Administrador",
      error: null,
    };
  }

  // =========================================================
  // 4. NÃO É DONO
  //    ENTÃO PROCURAR COMO MEMBRO
  // =========================================================
  //
  // Estrutura correta do projeto:
  //
  // tabela: membros_barbearia
  // coluna: user_id
  // coluna: barbearia_id
  // coluna: cargo
  // coluna: ativo
  //
  // =========================================================

  const {
    data: membro,
    error: errorMembro,
  } = await supabase
    .from("membros_barbearia")
    .select(`
      barbearia_id,
      cargo,
      ativo
    `)
    .eq("user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (errorMembro) {
    console.error("========================================");
    console.error("ERRO AO BUSCAR MEMBRO");
    console.error("Mensagem:", errorMembro.message);
    console.error("Código:", errorMembro.code);
    console.error("Detalhes:", errorMembro.details);
    console.error("========================================");

    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error(
        errorMembro.message || "Erro ao buscar vínculo do usuário."
      ),
    };
  }

  // =========================================================
  // 5. USUÁRIO NÃO É DONO NEM MEMBRO
  // =========================================================

  if (!membro) {
    console.error("========================================");
    console.error("USUÁRIO SEM BARBEARIA");
    console.error("Usuário:", user.id);
    console.error("========================================");

    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error(
        "Este usuário não está associado a nenhuma barbearia."
      ),
    };
  }

  // =========================================================
  // 6. BUSCAR BARBEARIA DO MEMBRO
  // =========================================================

  const {
    data: barbeariaMembro,
    error: errorBarbeariaMembro,
  } = await supabase
    .from("barbearias")
    .select(`
      id,
      nome,
      logo_url,
      cor_primaria,
      cor_secundaria,
      whatsapp,
      mensagem_confirmacao,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      descricao,
      horarios_funcionamento
    `)
    .eq("id", membro.barbearia_id)
    .maybeSingle();

  if (errorBarbeariaMembro) {
    console.error("========================================");
    console.error("ERRO AO BUSCAR BARBEARIA DO MEMBRO");
    console.error("Mensagem:", errorBarbeariaMembro.message);
    console.error("Código:", errorBarbeariaMembro.code);
    console.error("Detalhes:", errorBarbeariaMembro.details);
    console.error("========================================");

    return {
      barbearia: null,
      tipoUsuario: "membro",
      cargo: membro.cargo ?? null,
      error: new Error(
        errorBarbeariaMembro.message ||
          "Erro ao buscar barbearia do membro."
      ),
    };
  }

  // =========================================================
  // 7. BARBEARIA DO MEMBRO NÃO ENCONTRADA
  // =========================================================

  if (!barbeariaMembro) {
    console.error("========================================");
    console.error("BARBEARIA DO MEMBRO NÃO ENCONTRADA");
    console.error("Barbearia ID:", membro.barbearia_id);
    console.error("Usuário:", user.id);
    console.error("========================================");

    return {
      barbearia: null,
      tipoUsuario: "membro",
      cargo: membro.cargo ?? null,
      error: new Error(
        "A barbearia associada ao funcionário não foi encontrada."
      ),
    };
  }

  // =========================================================
  // 8. RETORNAR BARBEARIA DO MEMBRO
  // =========================================================

  console.log("========================================");
  console.log("BARBEARIA ENCONTRADA COMO MEMBRO");
  console.log("ID:", barbeariaMembro.id);
  console.log("Nome:", barbeariaMembro.nome);
  console.log("Cargo:", membro.cargo);
  console.log("========================================");

  return {
    barbearia: barbeariaMembro as BarbeariaUsuario,
    tipoUsuario: "membro",
    cargo: membro.cargo ?? "Barbeiro",
    error: null,
  };
}