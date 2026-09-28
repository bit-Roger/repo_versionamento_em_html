import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Mesmo separador usado em salvar-versionamento.mjs.
const SEPARADOR_VERSOES = " | ";

function response(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

/*
 * Registros salvos antes da correção guardavam "undefined" na versão.
 */
function lerVersoes(versao) {
  const texto = String(versao ?? "").trim();

  if (!texto || texto === "undefined") return null;

  return texto
    .split(SEPARADOR_VERSOES)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

/*
 * Remonta a sequência do editor. A "ordem" de cada seção é a posição
 * dela no documento contando as versões; as posições livres são das
 * versões, na ordem em que foram digitadas.
 */
function montarBlocos(versoes, secoes) {
  const blocos = [];
  const pendentes = [...versoes];
  const total = versoes.length + secoes.length;
  const porPosicao = new Map(secoes.map((secao) => [secao.ordem, secao]));

  for (let posicao = 1; posicao <= total; posicao++) {
    const secao = porPosicao.get(posicao);

    if (secao) {
      blocos.push({ tipo: "secao", ...secao });
    } else if (pendentes.length) {
      blocos.push({ tipo: "versao", texto: pendentes.shift() });
    }
  }

  // Segurança: nada fica de fora se as posições não baterem.
  const usadas = new Set(blocos.filter((b) => b.tipo === "secao").map((b) => b.ordem));

  for (const secao of secoes) {
    if (!usadas.has(secao.ordem)) blocos.push({ tipo: "secao", ...secao });
  }

  for (const texto of pendentes) {
    blocos.push({ tipo: "versao", texto });
  }

  return blocos;
}

/*
 * GET /.netlify/functions/abrir-versionamento?id=<id>
 *   Retorna o versionamento com versões, seções e itens, na ordem
 *   do documento, para ser carregado de volta no editor.
 */
export default async (request) => {
  if (request.method !== "GET") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return response(400, { ok: false, error: "Informe o id." });
    }

    const { data: versionamento, error } = await supabase
      .from("versionamentos")
      .select("id, modelo_sistema, versao, criado_em, secoes(id, titulo, ordem, itens(caminho_sistema, descricao, ordem))")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!versionamento) {
      return response(404, { ok: false, error: "Versionamento não encontrado." });
    }

    const secoes = (versionamento.secoes || [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((secao) => ({
        titulo: secao.titulo,
        ordem: secao.ordem,
        itens: (secao.itens || [])
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => ({
            caminho_sistema: item.caminho_sistema,
            descricao: item.descricao
          }))
      }));

    const versoes = lerVersoes(versionamento.versao);

    return response(200, {
      ok: true,
      id: versionamento.id,
      modelo_sistema: versionamento.modelo_sistema,
      versoes_perdidas: !versoes,
      // Sem versões salvas, o editor abre um campo de versão vazio no topo.
      blocos: versoes
        ? montarBlocos(versoes, secoes)
        : [
            { tipo: "versao", texto: "" },
            ...secoes.map((secao) => ({ tipo: "secao", ...secao }))
          ]
    });

  } catch (error) {
    console.error("Erro ao abrir versionamento:", error);

    return response(500, {
      ok: false,
      error: error?.message || "Erro interno ao abrir o versionamento."
    });
  }
};
