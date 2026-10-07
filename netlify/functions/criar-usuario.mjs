import {
  supabase,
  response,
  lerSessao,
  naoAutenticado,
  normalizarUsuario,
  REGRA_USUARIO,
  senhaValida
} from "../lib/auth.mjs";

/*
 * POST /.netlify/functions/criar-usuario  { usuario, senha }
 *   Só quem está logado pode criar novos usuários.
 */
export default async (request) => {
  if (request.method !== "POST") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    if (!(await lerSessao(request))) return naoAutenticado();

    const body = await request.json().catch(() => ({}));
    const usuario = normalizarUsuario(body.usuario);

    if (!REGRA_USUARIO.test(usuario)) {
      return response(400, {
        ok: false,
        error: "Usuário inválido. Use o formato nome.sobrenome (ex.: roger.penha)."
      });
    }

    if (!senhaValida(body.senha)) {
      return response(400, {
        ok: false,
        error: "Senha inválida. Use pelo menos 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial."
      });
    }

    const { error } = await supabase.rpc("criar_usuario", {
      p_usuario: usuario,
      p_senha: body.senha
    });

    if (error) {
      // Mensagens de validação vindas do próprio banco (ex.: usuário já existe).
      if (error.code === "P0001") {
        return response(400, { ok: false, error: error.message });
      }

      throw error;
    }

    return response(201, { ok: true, usuario });

  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    return response(500, { ok: false, error: "Erro interno ao criar o usuário." });
  }
};
