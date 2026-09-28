import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET = "versionamentos-pdfs";

// Separador das versões na coluna versionamentos.versao.
// Precisa ser o mesmo usado em abrir-versionamento.mjs.
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

function limparNomeArquivo(nome) {
  return String(nome || "versionamento.pdf")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);
}

function validarPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Dados inválidos.");
  }

  if (!body.pdf_base64) {
    throw new Error("PDF não recebido.");
  }

  if (!Array.isArray(body.versoes) || !body.versoes.length) {
    throw new Error("Informe pelo menos uma versão.");
  }

  if (!Array.isArray(body.secoes) || !body.secoes.length) {
    throw new Error("Adicione pelo menos uma seção.");
  }
}

/*
 * A data digitada vem dentro do texto da versão
 * (ex.: "v1.02.3 - 28/09/2026"). Sem data, usa a de hoje.
 */
function extrairData(versoes) {
  for (const versao of versoes) {
    const encontrada = String(versao).match(/\d{2}\/\d{2}\/\d{4}/);

    if (encontrada) return encontrada[0];
  }

  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  });
}

function dadosVersao(body) {
  return {
    versao: body.versoes.map(String).join(SEPARADOR_VERSOES),
    data_digitada: extrairData(body.versoes)
  };
}

async function removerSecoes(ids) {
  if (!ids.length) return;

  const { error: itensError } = await supabase
    .from("itens")
    .delete()
    .in("secao_id", ids);

  if (itensError) {
    throw itensError;
  }

  const { error: secoesError } = await supabase
    .from("secoes")
    .delete()
    .in("id", ids);

  if (secoesError) {
    throw secoesError;
  }
}

/*
 * Salva as seções e os itens. A "ordem" de cada seção é a posição dela
 * no documento contando também as versões; é isso que permite remontar
 * versões e seções intercaladas ao abrir o versionamento para edição.
 */
async function inserirSecoes(versionamentoId, secoes) {
  const { data: secoesCriadas, error: secoesError } = await supabase
    .from("secoes")
    .insert(
      secoes.map((secao) => ({
        versionamento_id: versionamentoId,
        titulo: String(secao.titulo),
        ordem: Number(secao.ordem || 0)
      }))
    )
    .select("id, ordem");

  if (secoesError) {
    throw secoesError;
  }

  const idsCriados = secoesCriadas.map((secao) => secao.id);
  const itensParaInserir = [];

  for (const secaoCriada of secoesCriadas) {
    const secaoOriginal = secoes.find(
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
    await removerSecoes(idsCriados).catch(() => {});
    throw itensError;
  }

  return idsCriados;
}

async function enviarPdf(caminho, base64) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, Buffer.from(base64, "base64"), {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600"
    });

  if (error) {
    throw error;
  }
}

/*
 * Novo versionamento: cria o registro, o PDF, as seções e os itens.
 * Se algo falhar, desfaz tudo.
 */
async function criar(body, nomeArquivo) {
  let versionamentoId = null;
  let pdfPath = null;

  try {
    // 1. Cria o registro principal.
    const { data: versionamento, error: versionamentoError } = await supabase
      .from("versionamentos")
      .insert({
        modelo_sistema: String(body.modelo_sistema),
        ...dadosVersao(body),
        criado_em: new Date().toISOString()
      })
      .select("id")
      .single();

    if (versionamentoError) {
      throw versionamentoError;
    }

    versionamentoId = versionamento.id;

    // 2. Faz upload do PDF para o Storage privado.
    pdfPath = `${versionamentoId}/${nomeArquivo}`;
    await enviarPdf(pdfPath, body.pdf_base64);

    // 3. Salva as seções e os itens.
    await inserirSecoes(versionamentoId, body.secoes);

    // 4. Salva o caminho do PDF no registro principal.
    const { error: updateError } = await supabase
      .from("versionamentos")
      .update({ pdf_path: pdfPath })
      .eq("id", versionamentoId);

    if (updateError) {
      throw updateError;
    }

    return { id: versionamentoId, pdf_path: pdfPath };

  } catch (error) {
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

    throw error;
  }
}

/*
 * Edição: grava o conteúdo novo primeiro e só depois apaga o antigo.
 * Se algo falhar no meio, o versionamento anterior continua intacto.
 */
async function atualizar(body, nomeArquivo) {
  const id = body.id;

  const { data: atual, error: atualError } = await supabase
    .from("versionamentos")
    .select("id, pdf_path")
    .eq("id", id)
    .maybeSingle();

  if (atualError) {
    throw atualError;
  }

  if (!atual) {
    const erro = new Error("Versionamento não encontrado.");
    erro.status = 404;
    throw erro;
  }

  const { data: secoesAntigas, error: secoesAntigasError } = await supabase
    .from("secoes")
    .select("id")
    .eq("versionamento_id", id);

  if (secoesAntigasError) {
    throw secoesAntigasError;
  }

  // Pasta nova a cada edição, para não sobrescrever o PDF anterior.
  const pdfPath = `${id}/${Date.now()}/${nomeArquivo}`;
  let secoesNovas = [];

  try {
    await enviarPdf(pdfPath, body.pdf_base64);
    secoesNovas = await inserirSecoes(id, body.secoes);

    const { error: updateError } = await supabase
      .from("versionamentos")
      .update({ ...dadosVersao(body), pdf_path: pdfPath })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

  } catch (error) {
    try {
      await removerSecoes(secoesNovas);
      await supabase.storage.from(BUCKET).remove([pdfPath]);
    } catch (cleanupError) {
      console.error("Erro ao desfazer edição:", cleanupError);
    }

    throw error;
  }

  // O conteúdo novo já está salvo; uma falha aqui só deixa sobras.
  try {
    await removerSecoes(secoesAntigas.map((secao) => secao.id));
  } catch (cleanupError) {
    console.error("Erro ao remover seções antigas:", cleanupError);
  }

  if (atual.pdf_path && atual.pdf_path !== pdfPath) {
    try {
      await supabase.storage.from(BUCKET).remove([atual.pdf_path]);
    } catch (cleanupError) {
      console.error("Erro ao remover PDF antigo:", cleanupError);
    }
  }

  return { id, pdf_path: pdfPath };
}

export default async (request) => {
  if (request.method !== "POST") {
    return response(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const body = await request.json();
    validarPayload(body);

    const nomeArquivo = limparNomeArquivo(body.nome_arquivo);

    const resultado = body.id
      ? await atualizar(body, nomeArquivo)
      : await criar(body, nomeArquivo);

    return response(body.id ? 200 : 201, {
      ok: true,
      ...resultado,
      nome_arquivo: nomeArquivo
    });

  } catch (error) {
    console.error("Erro ao salvar versionamento:", error);

    return response(error?.status || 500, {
      ok: false,
      error: error?.message || "Erro interno ao salvar o versionamento."
    });
  }
};
