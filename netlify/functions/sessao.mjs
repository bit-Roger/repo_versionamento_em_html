import { response, lerSessao, naoAutenticado } from "../lib/auth.mjs";

/*
 * GET /.netlify/functions/sessao
 *   Diz se o navegador está logado e com qual usuário.
 */
export default async (request) => {
  if (request.method !== "GET") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const sessao = await lerSessao(request);

    if (!sessao) return naoAutenticado();

    return response(200, { ok: true, usuario: sessao.usuario });

  } catch (error) {
    console.error("Erro ao ler sessão:", error);

    return response(500, { ok: false, error: "Erro interno ao verificar o login." });
  }
};
