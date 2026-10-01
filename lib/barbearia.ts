import { createClient } from "@/lib/supabase/client";

export type TipoUsuario = "dono" | "membro";

export type BarbeariaUsuario = {
  id: string;
  nome: string;

  logo_url: string | null;

  cor_primaria: string | null;
  cor_secundaria: string | null;

  whatsapp: string | null;
  mensagem_confirmacao: string | null;

  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;

  descricao: string | null;

  horarios_funcionamento: Record<string, unknown> | null;
};

export async function getBarbeariaDoUsuario() {
  const supabase = createClient();

  const {
    data: { user },
    error: erroUsuario,
  } = await supabase.auth.getUser();

  if (erroUsuario) {
    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: erroUsuario,
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

  // =====================================================
  // 1. VERIFICA SE É O DONO
  // =====================================================

  const {
    data: barbeariaDono,
    error: erroDono,
  } = await supabase
    .from("barbearias")
    .select(`
      id,
      nome,
      logo_url,
      cor_primaria,
      whatsapp,
      mensagem_confirmacao
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (erroDono) {
    console.error(
      "Erro ao buscar barbearia do dono:",
      erroDono
    );
  }

  if (barbeariaDono) {
    return {
      barbearia: barbeariaDono,
      tipoUsuario: "dono" as TipoUsuario,
      cargo: "Administrador",
      error: null,
    };
  }

  // =====================================================
  // 2. NÃO É DONO → PROCURA COMO MEMBRO
  // =====================================================

  const {
    data: membro,
    error: erroMembro,
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

  if (erroMembro) {
    console.error(
      "Erro ao buscar membro da barbearia:",
      erroMembro
    );

    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: erroMembro,
    };
  }

  if (!membro) {
    return {
      barbearia: null,
      tipoUsuario: null,
      cargo: null,
      error: new Error(
        "Usuário não está vinculado a uma barbearia."
      ),
    };
  }

  // =====================================================
  // 3. BUSCA A BARBEARIA DO MEMBRO
  // =====================================================

  const {
    data: barbeariaMembro,
    error: erroBarbearia,
  } = await supabase
    .from("barbearias")
    .select(`
      id,
      nome,
      logo_url,
      cor_primaria,
      whatsapp,
      mensagem_confirmacao
    `)
    .eq("id", membro.barbearia_id)
    .maybeSingle();

  if (erroBarbearia || !barbeariaMembro) {
    console.error(
      "Erro ao buscar barbearia do membro:",
      erroBarbearia
    );

    return {
      barbearia: null,
      tipoUsuario: "membro" as TipoUsuario,
      cargo: membro.cargo || "Barbeiro",
      error:
        erroBarbearia ||
        new Error("Barbearia do membro não encontrada."),
    };
  }

  return {
    barbearia: barbeariaMembro,
    tipoUsuario: "membro" as TipoUsuario,
    cargo: membro.cargo || "Barbeiro",
    error: null,
  };
}