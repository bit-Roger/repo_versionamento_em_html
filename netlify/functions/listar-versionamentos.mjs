import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET = "versionamentos-pdfs";
const MODELOS = ["PCA", "CIA", "PTM", "PTM_Adm"];
const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

// O link assinado vale por pouco tempo; o bucket continua privado.
const VALIDADE_LINK_SEGUNDOS = 120;

function response(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function nomeDoArquivo(pdfPath) {
  return String(pdfPath || "").split("/").pop() || "versionamento.pdf";
}

/*
 * GET /.netlify/functions/listar-versionamentos?modelo=PCA&limite=50
 *   Lista os versionamentos com PDF salvo, do mais recente ao mais antigo.
 *
 * GET /.netlify/functions/listar-versionamentos?id=<id>
 *   Retorna um link temporário para baixar o PDF daquele versionamento.
 */
export default async (request) => {
  if (request.method !== "GET") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const params = new URL(request.url).searchParams;
    const id = params.get("id");

    // 1. Link de download de um PDF específico.
    if (id) {
      const { data: registro, error } = await supabase
        .from("versionamentos")
        .select("id, pdf_path")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!registro?.pdf_path) {
        return response(404, { ok: false, error: "PDF não encontrado." });
      }

      const nomeArquivo = nomeDoArquivo(registro.pdf_path);

      const { data: assinado, error: assinadoError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(registro.pdf_path, VALIDADE_LINK_SEGUNDOS, {
          download: nomeArquivo
        });

      if (assinadoError) {
        throw assinadoError;
      }

      return response(200, {
        ok: true,
        url: assinado.signedUrl,
        nome_arquivo: nomeArquivo
      });
    }

    // 2. Lista de PDFs salvos.
    const modelo = params.get("modelo");

    if (modelo && !MODELOS.includes(modelo)) {
      return response(400, { ok: false, error: "Modelo inválido." });
    }

    const limite = Math.min(
      Math.max(Number(params.get("limite")) || LIMITE_PADRAO, 1),
      LIMITE_MAXIMO
    );

    let consulta = supabase
      .from("versionamentos")
      .select("id, modelo_sistema, versao, criado_em, pdf_path")
      .not("pdf_path", "is", null)
      .order("criado_em", { ascending: false })
      .limit(limite);

    if (modelo) {
      consulta = consulta.eq("modelo_sistema", modelo);
    }

    const { data, error } = await consulta;

    if (error) {
      throw error;
    }

    return response(200, {
      ok: true,
      itens: data.map((registro) => ({
        id: registro.id,
        modelo_sistema: registro.modelo_sistema,
        versao: registro.versao,
        criado_em: registro.criado_em,
        nome_arquivo: nomeDoArquivo(registro.pdf_path)
      }))
    });

  } catch (error) {
    console.error("Erro ao listar versionamentos:", error);

    return response(500, {
      ok: false,
      error: error?.message || "Erro interno ao listar os versionamentos."
    });
  }
};
