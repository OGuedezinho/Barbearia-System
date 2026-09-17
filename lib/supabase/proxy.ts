import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

const PREFERENCIA_COOKIE =
  "barber-system-manter-conectado";

export async function updateSession(
  request: NextRequest
) {
  /*
   * ========================================
   * VERIFICAR PREFERÊNCIA DE LOGIN
   * ========================================
   *
   * Se o cookie não existir, significa que
   * o usuário NÃO escolheu manter a conta
   * conectada de forma permanente.
   *
   * Como esse cookie é de sessão quando
   * a opção está desmarcada, ele desaparece
   * quando o navegador é encerrado.
   */

  const preferencia =
    request.cookies.get(
      PREFERENCIA_COOKIE
    )?.value;

  const manterConectado =
    preferencia === "true";

  /*
   * ========================================
   * LIMPAR SESSÃO ANTIGA
   * ========================================
   *
   * Se o navegador foi fechado e aberto
   * novamente, a preferência "false" de
   * sessão não existe mais.
   *
   * Nesse caso removemos os cookies do
   * Supabase antes de verificar a sessão.
   */

  if (!manterConectado && !preferencia) {
    const resposta =
      NextResponse.next({
        request,
      });

    const cookies =
      request.cookies.getAll();

    for (const cookie of cookies) {
      /*
       * Os cookies utilizados pelo Supabase
       * normalmente começam com "sb-".
       */

      if (
        cookie.name.startsWith("sb-")
      ) {
        resposta.cookies.delete(
          cookie.name
        );
      }
    }

    /*
     * Também removemos os cookies da
     * requisição atual para impedir que
     * o Supabase reutilize a sessão.
     */

    for (const cookie of cookies) {
      if (
        cookie.name.startsWith("sb-")
      ) {
        request.cookies.delete(
          cookie.name
        );
      }
    }
  }

  /*
   * ========================================
   * CLIENTE SUPABASE
   * ========================================
   */

  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  /*
   * ========================================
   * VERIFICAR SESSÃO
   * ========================================
   */

  const {
    data: claimsData,
    error,
  } =
    await supabase.auth.getClaims();

  const claims =
    error
      ? null
      : claimsData?.claims;

  /*
   * ========================================
   * PROTEGER DASHBOARD
   * ========================================
   */

  if (
    !claims &&
    request.nextUrl.pathname.startsWith(
      "/dashboard"
    )
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/";

    return NextResponse.redirect(
      url
    );
  }

  return supabaseResponse;
}