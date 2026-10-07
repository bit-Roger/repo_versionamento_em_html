import { response, encerrarSessao } from "../lib/auth.mjs";

/*
 * POST /.netlify/functions/logout
 *   Apaga a sessão no Supabase e o cookie do navegador.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const setCookie = await encerrarSessao(request);

    return response(200, { ok: true }, { "Set-Cookie": setCookie });

  } catch (error) {
    console.error("Erro no logout:", error);

    return response(500, { ok: false, error: "Erro interno ao sair." });
  }
};
