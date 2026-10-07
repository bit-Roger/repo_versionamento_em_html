import {
  supabase,
  response,
  criarSessao,
  normalizarUsuario,
  REGRA_USUARIO,
  senhaValida
} from "../lib/auth.mjs";

const ERRO_LOGIN = "Usuário ou senha incorretos.";

/*
 * POST /.netlify/functions/login  { usuario, senha }
 *   Confere a senha no Supabase e grava o cookie da sessão.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const usuario = normalizarUsuario(body.usuario);
    const senha = body.senha;

    // Fora das regras não existe conta; nem consulta o banco.
    if (!REGRA_USUARIO.test(usuario) || !senhaValida(senha)) {
      return response(401, { ok: false, error: ERRO_LOGIN });
    }

    const { data: usuarioId, error } = await supabase.rpc("verificar_login", {
      p_usuario: usuario,
      p_senha: senha
    });

    if (error) throw error;

    if (!usuarioId) {
      return response(401, { ok: false, error: ERRO_LOGIN });
    }

    const setCookie = await criarSessao(usuarioId);

    return response(200, { ok: true, usuario }, { "Set-Cookie": setCookie });

  } catch (error) {
    console.error("Erro no login:", error);

    return response(500, { ok: false, error: "Erro interno ao fazer login." });
  }
};
