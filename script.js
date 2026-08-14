const modelos = {
  PCA: {
    sigla: 'PCA',
    nome: 'Prestação de Contas e Auditoria',
    titulo: 'ATUALIZAÇÃO DO SISTEMA PCA',
    introducao: 'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PCA.'
  },
  CIA: {
    sigla: 'CIA',
    nome: 'Controle Interno e Auditoria',
    titulo: 'ATUALIZAÇÃO DO SISTEMA CIA',
    introducao: 'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema CIA.'
  },
  PTM: {
    sigla: 'PTM',
    nome: 'Portal da Transparência Municipal',
    titulo: 'ATUALIZAÇÃO DO SISTEMA PTM',
    introducao: 'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM.'
  },
  PTM_ADM: {
    sigla: 'PTM_ADM',
    nome: 'Portal da Transparência Municipal Administrativo',
    titulo: 'ATUALIZAÇÃO DO SISTEMA PTM_ADM',
    introducao: 'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM_ADM.'
  }
};

let modeloSelecionado = null;
let contadorSecao = 0;

function selecionarModelo(sigla) {
  const modelo = modelos[sigla];

  if (!modelo) {
    console.error('Modelo inválido:', sigla);
    return;
  }

  modeloSelecionado = modelo;

  document.title = `Versionamento - ${modelo.sigla}`;

  const tituloSistema = document.getElementById('tituloSistema');
  const nomeSistema = document.getElementById('nomeSistema');
  const textoIntroducao = document.getElementById('textoIntroducao');

  if (tituloSistema) tituloSistema.textContent = modelo.titulo;
  if (nomeSistema) nomeSistema.textContent = modelo.nome;
  if (textoIntroducao) textoIntroducao.textContent = modelo.introducao;

  const overlay = document.getElementById('modeloOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function adicionarSecao() {
  contadorSecao++;
  const id = contadorSecao;
  const container = document.getElementById('secoesContainer');

  const div = document.createElement('div');
  div.className = 'secao-editor';
  div.id = 'secao-' + id;
  div.innerHTML = `
    <button class="btn-remover remover-secao" onclick="removerSecao(${id})">remover seção ✕</button>
    <input class="secao-titulo-input" placeholder="Título da seção (ex: Correções)" data-role="titulo">
    <div class="itens-lista" id="itens-${id}"></div>
    <div class="linha-botoes">
      <button class="btn-item" onclick="adicionarItem(${id})">+ Adicionar item</button>
    </div>
  `;

  container.appendChild(div);
  adicionarItem(id);
}

function adicionarItem(secaoId) {
  const lista = document.getElementById('itens-' + secaoId);
  const item = document.createElement('div');
  item.className = 'item-editor';
  item.innerHTML = `
    <button class="btn-remover btn-remover-item" onclick="this.parentElement.remove()">remover item ✕</button>
    <label>Caminho no sistema</label>
    <input placeholder="Ex: Cadastros &gt; Fornecedores &gt; Editar" data-role="h3">
    <div class="caminho-hint">Use &gt; para indicar a setinha entre as telas.</div>
    <label>Descrição da mudança</label>
    <textarea rows="2" placeholder="Descreva o que mudou..." data-role="p"></textarea>
  `;
  lista.appendChild(item);
}

function removerSecao(id) {
  const secao = document.getElementById('secao-' + id);
  if (secao) secao.remove();
}

function textoSeguro(valor) {
  return (valor || '').trim();
}

function criarTexto(parent, texto, classe) {
  const el = document.createElement('span');
  el.className = 'print-value ' + (classe || '');
  el.textContent = texto;
  return el;
}

function montarDocumentoImpressao() {
  const origem = document.querySelector('.page');

  if (!origem) {
    throw new Error('Página principal não encontrada.');
  }

  const copia = origem.cloneNode(true);

  // Remove controles que não devem entrar no PDF.
  copia.querySelectorAll('button, .linha-botoes, .caminho-hint, label').forEach(el => el.remove());

  // Versão.
  const versaoOriginal = origem.querySelector('.versao-input');
  const versaoDestino = copia.querySelector('.versao-input');

  if (versaoDestino) {
    const valor = textoSeguro(versaoOriginal ? versaoOriginal.value : '');
    const texto = criarTexto(document.createElement('div'), valor, 'versao-print');
    versaoDestino.replaceWith(texto);
  }

  // Data.
  const dataOriginal = origem.querySelector('.data-input');
  const dataDestino = copia.querySelector('.data-input');

  if (dataDestino) {
    const valor = textoSeguro(dataOriginal ? dataOriginal.value : '');
    const texto = criarTexto(document.createElement('div'), valor, 'data-print');
    dataDestino.replaceWith(texto);
  }

  // Seções e itens.
  const secoesOrigem = origem.querySelectorAll('.secao-editor');
  const secoesDestino = copia.querySelectorAll('.secao-editor');

  secoesOrigem.forEach((secao, indice) => {
    const destino = secoesDestino[indice];
    if (!destino) return;

    const tituloOrigem = secao.querySelector('[data-role="titulo"]');
    const tituloDestino = destino.querySelector('[data-role="titulo"]');

    if (tituloDestino) {
      const texto = criarTexto(
        document.createElement('div'),
        textoSeguro(tituloOrigem ? tituloOrigem.value : ''),
        ''
      );
      texto.className = 'section-title';
      tituloDestino.replaceWith(texto);
    }

    const itensOrigem = secao.querySelectorAll('.item-editor');
    const itensDestino = destino.querySelectorAll('.item-editor');

    itensOrigem.forEach((item, itemIndex) => {
      const itemDestino = itensDestino[itemIndex];
      if (!itemDestino) return;

      const h3Origem = item.querySelector('[data-role="h3"]');
      const pOrigem = item.querySelector('[data-role="p"]');

      const h3Destino = itemDestino.querySelector('[data-role="h3"]');
      const pDestino = itemDestino.querySelector('[data-role="p"]');

      if (h3Destino) {
        h3Destino.replaceWith(
          criarTexto(
            document.createElement('div'),
            textoSeguro(h3Origem ? h3Origem.value : ''),
            ''
          )
        );
      }

      if (pDestino) {
        const p = document.createElement('p');
        p.className = 'print-value';
        p.textContent = textoSeguro(pOrigem ? pOrigem.value : '');
        pDestino.replaceWith(p);
      }
    });
  });

  const introTela = origem.querySelector('.sub');
  const introPDF = copia.querySelector('.sub');

  if (introTela && introPDF) {
    introPDF.textContent = textoSeguro(introTela.textContent);
  }

  return copia;
}

function coletarDadosVersionamento() {
  if (!modeloSelecionado) {
    throw new Error('Selecione o modelo do sistema antes de gerar o PDF.');
  }

  const versao = textoSeguro(document.querySelector('.versao-input')?.value);
  const dataDigitada = textoSeguro(document.querySelector('.data-input')?.value);

  if (!versao) {
    throw new Error('Informe a versão.');
  }

  if (!dataDigitada) {
    throw new Error('Informe a data.');
  }

  const secoes = [...document.querySelectorAll('.secao-editor')].map((secao, index) => {
    const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);

    if (!titulo) {
      throw new Error(`Informe o título da seção ${index + 1}.`);
    }

    const itens = [...secao.querySelectorAll('.item-editor')].map((item, itemIndex) => {
      const caminho = textoSeguro(item.querySelector('[data-role="h3"]')?.value);
      const descricao = textoSeguro(item.querySelector('[data-role="p"]')?.value);

      if (!caminho) {
        throw new Error(`Informe o caminho no sistema do item ${itemIndex + 1} da seção "${titulo}".`);
      }

      if (!descricao) {
        throw new Error(`Informe a descrição do item ${itemIndex + 1} da seção "${titulo}".`);
      }

      return {
        caminho_sistema: caminho,
        descricao,
        ordem: itemIndex + 1
      };
    });

    if (!itens.length) {
      throw new Error(`A seção "${titulo}" precisa ter pelo menos um item.`);
    }

    return {
      titulo,
      ordem: index + 1,
      itens
    };
  });

  if (!secoes.length) {
    throw new Error('Adicione pelo menos uma seção.');
  }

  return {
    modelo_sistema: modeloSelecionado.sigla,
    versao,
    data_digitada: dataDigitada,
    secoes
  };
}

function criarNomeArquivo(dados) {
  const data = new Date().toISOString().replace(/[:.]/g, '-');
  const versao = dados.versao.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${dados.modelo_sistema}_${versao}_${data}.pdf`;
}

async function gerarPdfBlob(elemento) {
  if (typeof window.html2pdf !== 'function') {
    throw new Error('A biblioteca de geração de PDF não foi carregada. Verifique o script html2pdf.js no index.html.');
  }

  // O clone fica fora da tela, mas continua renderizável pelo html2canvas.
  const wrapper = document.createElement('div');
  wrapper.id = 'pdfGeracaoTemporaria';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = '210mm';
  wrapper.style.background = '#fff';
  wrapper.style.zIndex = '-1';
  wrapper.appendChild(elemento);
  document.body.appendChild(wrapper);

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));

    const opcoes = {
      margin: 0,
      filename: 'versionamento.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy']
      }
    };

    return await window.html2pdf()
      .set(opcoes)
      .from(elemento)
      .outputPdf('blob');
  } finally {
    wrapper.remove();
  }
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const resultado = reader.result;
      const base64 = resultado.split(',')[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function salvarNoServidor(dados, pdfBlob) {
  const pdfBase64 = await blobParaBase64(pdfBlob);
  const nomeArquivo = criarNomeArquivo(dados);

  const resposta = await fetch('/.netlify/functions/salvar-versionamento', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...dados,
      nome_arquivo: nomeArquivo,
      pdf_base64: pdfBase64
    })
  });

  let resultado = null;

  try {
    resultado = await resposta.json();
  } catch {
    throw new Error(`O servidor retornou uma resposta inválida (HTTP ${resposta.status}).`);
  }

  if (!resposta.ok || !resultado.ok) {
    throw new Error(resultado?.error || 'Não foi possível salvar o versionamento.');
  }

  return resultado;
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function imprimirPDF() {
  const botao = document.querySelector('.btn-pdf');

  try {
    const dados = coletarDadosVersionamento();

    if (botao) {
      botao.disabled = true;
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = 'Gerando e salvando PDF...';
    }

    const copia = montarDocumentoImpressao();
    const pdfBlob = await gerarPdfBlob(copia);

    const resultado = await salvarNoServidor(dados, pdfBlob);

    baixarBlob(pdfBlob, resultado.nome_arquivo || criarNomeArquivo(dados));

    alert('Versionamento salvo com sucesso e PDF armazenado.');

  } catch (erro) {
    console.error('Erro ao gerar/salvar versionamento:', erro);
    alert(erro.message || 'Ocorreu um erro ao gerar ou salvar o versionamento.');
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = botao.dataset.textoOriginal || 'Imprimir / Gerar PDF';
    }
  }
}

adicionarSecao();
