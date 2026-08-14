import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  if (!modelo) return;

  modeloSelecionado = modelo;
  document.title = `Versionamento - ${modelo.sigla}`;

  document.getElementById('tituloSistema').textContent = modelo.titulo;
  document.getElementById('nomeSistema').textContent = modelo.nome;
  document.getElementById('textoIntroducao').textContent = modelo.introducao;

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
    <button type="button" class="btn-remover remover-secao" onclick="removerSecao(${id})">remover seção ✕</button>
    <input class="secao-titulo-input" placeholder="Título da seção (ex: Correções)" data-role="titulo">
    <div class="itens-lista" id="itens-${id}"></div>
    <div class="linha-botoes">
      <button type="button" class="btn-item" onclick="adicionarItem(${id})">+ Adicionar item</button>
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
    <button type="button" class="btn-remover btn-remover-item" onclick="this.parentElement.remove()">remover item ✕</button>
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

function criarTexto(texto, classe = '') {
  const el = document.createElement('div');
  el.className = `print-value ${classe}`.trim();
  el.textContent = texto;
  return el;
}

function criarCabecalhoPDF(origem) {
  const header = origem.querySelector('header.top').cloneNode(true);
  const versao = origem.querySelector('.versao-input');
  const data = origem.querySelector('.data-input');

  const versaoDestino = header.querySelector('.versao-input');
  if (versaoDestino) {
    versaoDestino.replaceWith(criarTexto(textoSeguro(versao?.value), 'versao-print'));
  }

  const dataDestino = header.querySelector('.data-input');
  if (dataDestino) {
    dataDestino.replaceWith(criarTexto(textoSeguro(data?.value), 'data-print'));
  }

  header.classList.add('pdf-header');
  return header;
}

function criarRodapePDF(origem) {
  const footer = origem.querySelector('footer.bottom').cloneNode(true);
  footer.classList.add('pdf-footer');
  return footer;
}

function criarBlocosPDF(origem) {
  const blocos = [];

  const intro = origem.querySelector('.sub');
  if (intro && textoSeguro(intro.textContent)) {
    const introClone = document.createElement('p');
    introClone.className = 'sub pdf-intro';
    introClone.textContent = textoSeguro(intro.textContent);
    blocos.push(introClone);
  }

  origem.querySelectorAll('.secao-editor').forEach(secao => {
    const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);
    if (!titulo) return;

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title pdf-section-title';
    sectionTitle.textContent = titulo;
    blocos.push(sectionTitle);

    secao.querySelectorAll('.item-editor').forEach(item => {
      const caminho = textoSeguro(item.querySelector('[data-role="h3"]')?.value);
      const descricao = textoSeguro(item.querySelector('[data-role="p"]')?.value);
      if (!caminho && !descricao) return;

      const itemPDF = document.createElement('div');
      itemPDF.className = 'item pdf-item';

      const h3 = document.createElement('h3');
      h3.textContent = caminho;
      itemPDF.appendChild(h3);

      const p = document.createElement('p');
      p.textContent = descricao;
      itemPDF.appendChild(p);

      blocos.push(itemPDF);
    });
  });

  return blocos;
}

function criarPaginaPDF(origem) {
  const pagina = document.createElement('section');
  pagina.className = 'pdf-page';

  const header = criarCabecalhoPDF(origem);
  const main = document.createElement('main');
  main.className = 'pdf-main';
  const footer = criarRodapePDF(origem);

  pagina.append(header, main, footer);
  return { pagina, main, header, footer };
}

function criarRaizPDF() {
  let raiz = document.getElementById('pdfRenderRoot');
  if (raiz) raiz.remove();

  raiz = document.createElement('div');
  raiz.id = 'pdfRenderRoot';
  raiz.className = 'pdf-render-root';
  document.body.appendChild(raiz);
  return raiz;
}

function adicionarBlocoNaPaginaAtual(pagina, bloco) {
  const clone = bloco.cloneNode(true);
  pagina.main.appendChild(clone);

  const estourou = pagina.main.scrollHeight > pagina.main.clientHeight + 1;
  if (estourou) {
    pagina.main.removeChild(clone);
    return false;
  }

  return true;
}

function criarPaginaNova(origem, raiz) {
  const pagina = criarPaginaPDF(origem);
  raiz.appendChild(pagina.pagina);
  return pagina;
}

function montarPaginasPDF() {
  const origem = document.querySelector('body > .page');
  if (!origem) throw new Error('Estrutura da página não encontrada.');

  const raiz = criarRaizPDF();
  const blocos = criarBlocosPDF(origem);

  let paginaAtual = criarPaginaNova(origem, raiz);

  for (const bloco of blocos) {
    if (adicionarBlocoNaPaginaAtual(paginaAtual, bloco)) continue;

    // Um bloco normal deve caber em uma página. Se não couber,
    // tentamos colocar o conteúdo como uma unidade de texto menor.
    const novaPagina = criarPaginaNova(origem, raiz);
    if (adicionarBlocoNaPaginaAtual(novaPagina, bloco)) {
      paginaAtual = novaPagina;
      continue;
    }

    // Fallback para descrições excepcionalmente grandes: o navegador
    // permite a quebra do texto dentro do item, sem perder conteúdo.
    const item = novaPagina.main.lastElementChild;
    if (item) item.style.overflow = 'visible';
    paginaAtual = novaPagina;
  }

  return raiz;
}

function esperarImagens(root) {
  const imagens = [...root.querySelectorAll('img')];
  return Promise.all(imagens.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = String(reader.result || '');
      resolve(resultado.includes(',') ? resultado.split(',')[1] : resultado);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function coletarDados() {
  const secoes = [];

  document.querySelectorAll('#secoesContainer .secao-editor').forEach((secao, indiceSecao) => {
    const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);
    if (!titulo) return;

    const itens = [];
    secao.querySelectorAll('.item-editor').forEach((item, indiceItem) => {
      const caminho = textoSeguro(item.querySelector('[data-role="h3"]')?.value);
      const descricao = textoSeguro(item.querySelector('[data-role="p"]')?.value);
      if (!caminho && !descricao) return;

      itens.push({
        caminho_sistema: caminho,
        descricao,
        ordem: indiceItem + 1
      });
    });

    secoes.push({
      titulo,
      ordem: indiceSecao + 1,
      itens
    });
  });

  return {
    modelo_sistema: modeloSelecionado.sigla,
    versao: textoSeguro(document.querySelector('.versao-input')?.value),
    data_digitada: textoSeguro(document.querySelector('.data-input')?.value),
    secoes
  };
}

function validarDados(dados) {
  if (!modeloSelecionado) throw new Error('Selecione o modelo do sistema antes de gerar o PDF.');
  if (!dados.versao) throw new Error('Informe a versão.');
  if (!dados.data_digitada) throw new Error('Informe a data.');
  if (!dados.secoes.length) throw new Error('Adicione pelo menos uma seção com título.');

  for (const secao of dados.secoes) {
    if (!secao.itens.length) {
      throw new Error(`A seção "${secao.titulo}" precisa ter pelo menos um item.`);
    }
    for (const item of secao.itens) {
      if (!item.caminho_sistema || !item.descricao) {
        throw new Error(`Preencha o caminho e a descrição em todos os itens da seção "${secao.titulo}".`);
      }
    }
  }
}

function nomeArquivoPDF(dados) {
  const dataArquivo = dados.data_digitada.replace(/[^0-9-]/g, '-');
  const versaoArquivo = dados.versao.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${dados.modelo_sistema}_${versaoArquivo}_${dataArquivo}.pdf`;
}

async function gerarPDFBlob(raiz, nomeArquivo) {

  await esperarImagens(raiz);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const paginas = [...raiz.querySelectorAll('.pdf-page')];
  if (!paginas.length) throw new Error('Nenhuma página foi criada para o PDF.');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  for (let i = 0; i < paginas.length; i++) {
    const pagina = paginas[i];

    const canvas = await html2canvas(pagina, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: pagina.offsetWidth,
      height: pagina.offsetHeight,
      windowWidth: pagina.offsetWidth,
      windowHeight: pagina.offsetHeight
    });

    if (i > 0) pdf.addPage('a4', 'portrait');

    const imagem = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imagem, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  return pdf.output('blob');
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function salvarNoSupabase(dados, pdfBlob, nomeArquivo) {
  const pdfBase64 = await blobParaBase64(pdfBlob);

  const resposta = await fetch('/.netlify/functions/salvar-versionamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...dados,
      nome_arquivo: nomeArquivo,
      pdf_base64: pdfBase64
    })
  });

  let resultado = {};
  try {
    resultado = await resposta.json();
  } catch (_) {
    resultado = {};
  }

  if (!resposta.ok || !resultado.ok) {
    throw new Error(resultado.error || `Não foi possível salvar no servidor (HTTP ${resposta.status}).`);
  }

  return resultado;
}

async function gerarESalvarPDF() {
  const botao = document.querySelector('.btn-pdf');
  let raiz = null;

  try {
    const dados = coletarDados();
    validarDados(dados);

    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Gerando PDF...';
    }

    const nomeArquivo = nomeArquivoPDF(dados);
    raiz = montarPaginasPDF();

    // Não usa window.print(). O PDF é criado diretamente em memória.
    const pdfBlob = await gerarPDFBlob(raiz, nomeArquivo);

    if (botao) botao.textContent = 'Salvando...';
    await salvarNoSupabase(dados, pdfBlob, nomeArquivo);

    baixarBlob(pdfBlob, nomeArquivo);
    alert('Versionamento salvo com sucesso e PDF gerado.');
  } catch (erro) {
    console.error(erro);
    alert(erro.message || 'Não foi possível gerar e salvar o PDF.');
  } finally {
    if (raiz) raiz.remove();
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Gerar / Salvar PDF';
    }
  }
}

adicionarSecao();

// As funções são expostas ao HTML porque os botões usam onclick.
Object.assign(window, { selecionarModelo, adicionarSecao, adicionarItem, removerSecao, gerarESalvarPDF });
