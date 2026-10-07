import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const COOKIE = "sessao";
const DURACAO_SESSAO_SEGUNDOS = 8 * 60 * 60; // 8 horas

// Mesmas regras de login.js e de supabase-login.sql.
export const REGRA_USUARIO = /^[a-z0-9]+\.[a-z0-9]+$/;

export function senhaValida(senha) {
  return typeof senha === "string" &&
    senha.length >= 8 &&
    senha.length <= 72 &&
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    /[^A-Za-z0-9]/.test(senha);
}

export function normalizarUsuario(usuario) {
  return String(usuario ?? "").trim().toLowerCase();
}

export function response(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function lerToken(request) {
  const cookies = request.headers.get("cookie") || "";

  for (const parte of cookies.split(";")) {
    const [nome, ...valor] = parte.trim().split("=");

    if (nome === COOKIE) return valor.join("=");
  }

  return null;
}

function cookie(valor, maxAge) {
  return `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function criarSessao(usuarioId) {
  const token = randomBytes(32).toString("hex");
  const agora = Date.now();

  // Aproveita o login para limpar sessões vencidas.
  await supabase
    .from("sessoes")
    .delete()
    .lt("expira_em", new Date(agora).toISOString());

  const { error } = await supabase.from("sessoes").insert({
    token_hash: hashToken(token),
    usuario_id: usuarioId,
    expira_em: new Date(agora + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString()
  });

  if (error) throw error;

  return cookie(token, DURACAO_SESSAO_SEGUNDOS);
}

export async function encerrarSessao(request) {
  const token = lerToken(request);

  if (token) {
    await supabase.from("sessoes").delete().eq("token_hash", hashToken(token));
  }

  return cookie("", 0);
}

/*
 * Retorna { id, usuario } do usuário logado, ou null.
 */
export async function lerSessao(request) {
  const token = lerToken(request);

  if (!token) return null;

  const { data, error } = await supabase
    .from("sessoes")
    .select("expira_em, usuarios(id, usuario, ativo)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) throw error;

  if (!data?.usuarios?.ativo || new Date(data.expira_em) <= new Date()) {
    return null;
  }

  return { id: data.usuarios.id, usuario: data.usuarios.usuario };
}

export const naoAutenticado = () =>
  response(401, { ok: false, error: "Faça login para continuar." });
