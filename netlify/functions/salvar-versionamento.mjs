import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET = "versionamentos-pdfs";

function response(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function limparNomeArquivo(nome) {
  return String(nome || "versionamento.pdf")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);
}

function validarPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Dados inválidos.");
  }

  if (!body.modelo_sistema || !body.versao || !body.data_digitada) {
    throw new Error("Modelo, versão e data são obrigatórios.");
  }

  if (!Array.isArray(body.secoes) || body.secoes.length === 0) {
    throw new Error("É necessário informar pelo menos uma seção.");
  }

  if (!body.pdf_base64) {
    throw new Error("PDF não recebido.");
  }

  for (const secao of body.secoes) {
    if (!secao.titulo) {
      throw new Error("Todas as seções precisam de título.");
    }

    if (!Array.isArray(secao.itens) || secao.itens.length === 0) {
      throw new Error(`A seção "${secao.titulo}" precisa ter pelo menos um item.`);
    }

    for (const item of secao.itens) {
      if (!item.caminho_sistema || !item.descricao) {
        throw new Error("Todos os itens precisam de caminho e descrição.");
      }
    }
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  let versionamentoId = null;
  let pdfPath = null;

  try {
    const body = await request.json();
    validarPayload(body);

    const nomeArquivo = limparNomeArquivo(body.nome_arquivo);
    const agora = new Date().toISOString();

    // 1. Cria o registro principal.
    const { data: versionamento, error: versionamentoError } = await supabase
      .from("versionamentos")
      .insert({
        modelo_sistema: String(body.modelo_sistema),
        versao: String(body.versao),
        data_digitada: String(body.data_digitada),
        criado_em: agora
      })
      .select("id")
      .single();

    if (versionamentoError) {
      throw versionamentoError;
    }

    versionamentoId = versionamento.id;

    // 2. Faz upload do PDF para o Storage privado.
    const pdfBuffer = Buffer.from(body.pdf_base64, "base64");
    pdfPath = `${versionamentoId}/${nomeArquivo}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
        cacheControl: "3600"
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Salva as seções.
    const secoesParaInserir = body.secoes.map((secao) => ({
      versionamento_id: versionamentoId,
      titulo: String(secao.titulo),
      ordem: Number(secao.ordem || 0)
    }));

    const { data: secoesCriadas, error: secoesError } = await supabase
      .from("secoes")
      .insert(secoesParaInserir)
      .select("id, ordem");

    if (secoesError) {
      throw secoesError;
    }

    // 4. Salva os itens vinculados às respectivas seções.
    const itensParaInserir = [];

    for (const secaoCriada of secoesCriadas) {
      const secaoOriginal = body.secoes.find(
        (secao) => Number(secao.ordem || 0) === Number(secaoCriada.ordem)
      );

      for (const item of secaoOriginal.itens) {
        itensParaInserir.push({
          secao_id: secaoCriada.id,
          caminho_sistema: String(item.caminho_sistema),
          descricao: String(item.descricao),
          ordem: Number(item.ordem || 0)
        });
      }
    }

    const { error: itensError } = await supabase
      .from("itens")
      .insert(itensParaInserir);

    if (itensError) {
      throw itensError;
    }

    // 5. Salva o caminho do PDF no registro principal.
    const { error: updateError } = await supabase
      .from("versionamentos")
      .update({
        pdf_path: pdfPath
      })
      .eq("id", versionamentoId);

    if (updateError) {
      throw updateError;
    }

    return response(201, {
      ok: true,
      id: versionamentoId,
      pdf_path: pdfPath,
      nome_arquivo: nomeArquivo
    });

  } catch (error) {
    console.error("Erro ao salvar versionamento:", error);

    // Tenta limpar o PDF caso o banco falhe depois do upload.
    if (pdfPath) {
      try {
        await supabase.storage.from(BUCKET).remove([pdfPath]);
      } catch (cleanupError) {
        console.error("Erro ao limpar PDF:", cleanupError);
      }
    }

    // Tenta limpar o registro principal; ON DELETE CASCADE remove filhos.
    if (versionamentoId) {
      try {
        await supabase
          .from("versionamentos")
          .delete()
          .eq("id", versionamentoId);
      } catch (cleanupError) {
        console.error("Erro ao limpar versionamento:", cleanupError);
      }
    }

    return response(500, {
      ok: false,
      error: error?.message || "Erro interno ao salvar o versionamento."
    });
  }
};
