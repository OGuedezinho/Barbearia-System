import { createClient } from "@/lib/supabase/client";

export async function getBarbeariaDoUsuario() {
  const supabase = createClient();

  const {
    data: { user },
    error: erroUsuario,
  } = await supabase.auth.getUser();

  if (erroUsuario || !user) {
    return {
      barbearia: null,
      user: null,
      error:
        erroUsuario ??
        new Error("Usuário não autenticado."),
      tipoUsuario: null,
      cargo: null,
    };
  }

  // ==========================================
  // 1. VERIFICA SE É O DONO
  // ==========================================

  const {
    data: barbeariaDono,
    error: erroDono,
  } = await supabase
    .from("barbearias")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (erroDono) {
    console.error(
      "ERRO AO BUSCAR BARBEARIA DO DONO:",
      erroDono
    );
  }

  if (barbeariaDono) {
    return {
      barbearia: barbeariaDono,
      user,
      error: null,
      tipoUsuario: "dono" as const,
      cargo: "Administrador",
    };
  }

  // ==========================================
  // 2. SE NÃO É DONO, PROCURA COMO MEMBRO
  // ==========================================

  const {
    data: membro,
    error: erroMembro,
  } = await supabase
    .from("membros_barbearia")
    .select(
      "barbearia_id, cargo, ativo"
    )
    .eq("user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (erroMembro) {
    console.error(
      "ERRO AO BUSCAR MEMBRO:",
      erroMembro
    );

    return {
      barbearia: null,
      user,
      error: erroMembro,
      tipoUsuario: null,
      cargo: null,
    };
  }

  if (!membro) {
    return {
      barbearia: null,
      user,
      error: new Error(
        "Usuário não está vinculado a nenhuma barbearia."
      ),
      tipoUsuario: null,
      cargo: null,
    };
  }

  // ==========================================
  // 3. BUSCA A BARBEARIA DO MEMBRO
  // ==========================================

  const {
    data: barbeariaMembro,
    error: erroBarbearia,
  } = await supabase
    .from("barbearias")
    .select("*")
    .eq(
      "id",
      membro.barbearia_id
    )
    .maybeSingle();

  if (
    erroBarbearia ||
    !barbeariaMembro
  ) {
    console.error(
      "ERRO AO BUSCAR BARBEARIA DO MEMBRO:",
      erroBarbearia
    );

    return {
      barbearia: null,
      user,
      error:
        erroBarbearia ??
        new Error(
          "Barbearia não encontrada."
        ),
      tipoUsuario: null,
      cargo: membro.cargo,
    };
  }

  return {
    barbearia: barbeariaMembro,
    user,
    error: null,
    tipoUsuario: "membro" as const,
    cargo: membro.cargo,
  };
}