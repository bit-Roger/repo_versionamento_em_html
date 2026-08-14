import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const modelos = {
  PCA: { sigla:'PCA', nome:'Prestação de Contas e Auditoria', titulo:'ATUALIZAÇÃO DO SISTEMA PCA', introducao:'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PCA.' },
  CIA: { sigla:'CIA', nome:'Controle Interno e Auditoria', titulo:'ATUALIZAÇÃO DO SISTEMA CIA', introducao:'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema CIA.' },
  PTM: { sigla:'PTM', nome:'Portal da Transparência Municipal', titulo:'ATUALIZAÇÃO DO SISTEMA PTM', introducao:'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM.' },
  PTM_ADM: { sigla:'PTM_ADM', nome:'Portal da Transparência Municipal Administrativo', titulo:'ATUALIZAÇÃO DO SISTEMA PTM_ADM', introducao:'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM_ADM.' }
};

let modeloSelecionado = null;
let contadorSecao = 0;
const PDF_W = 794;
const PDF_H = 1123;

const textoSeguro = valor => (valor || '').trim();

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
  div.id = `secao-${id}`;
  div.innerHTML = `
    <button type="button" class="btn-remover remover-secao" onclick="removerSecao(${id})">remover seção ✕</button>
    <input class="secao-titulo-input" placeholder="Título da seção (ex: Correções)" data-role="titulo">
    <div class="itens-lista" id="itens-${id}"></div>
    <div class="linha-botoes"><button type="button" class="btn-item" onclick="adicionarItem(${id})">+ Adicionar item</button></div>
  `;
  container.appendChild(div);
  adicionarItem(id);
}

function adicionarItem(secaoId) {
  const lista = document.getElementById(`itens-${secaoId}`);
  if (!lista) return;
  const item = document.createElement('div');
  item.className = 'item-editor';
  item.innerHTML = `
    <button type="button" class="btn-remover btn-remover-item" onclick="this.parentElement.remove()">remover item ✕</button>
    <label>Caminho no sistema</label>
    <input placeholder="Ex: Cadastros > Fornecedores > Editar" data-role="h3">
    <div class="caminho-hint">Use > para indicar a setinha entre as telas.</div>
    <label>Descrição da mudança</label>
    <textarea rows="2" placeholder="Descreva o que mudou..." data-role="p"></textarea>
  `;
  lista.appendChild(item);
}

function removerSecao(id) {
  document.getElementById(`secao-${id}`)?.remove();
}

function coletarDadosVersionamento() {
  if (!modeloSelecionado) throw new Error('Selecione o modelo do sistema antes de gerar o PDF.');
  const versao = textoSeguro(document.querySelector('.versao-input')?.value);
  const data_digitada = textoSeguro(document.querySelector('.data-input')?.value);
  if (!versao) throw new Error('Informe a versão.');
  if (!data_digitada) throw new Error('Informe a data.');

  const secoes = [...document.querySelectorAll('.secao-editor')].map((secao, index) => {
    const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);
    if (!titulo) throw new Error(`Informe o título da seção ${index + 1}.`);
    const itens = [...secao.querySelectorAll('.item-editor')].map((item, itemIndex) => {
      const caminho_sistema = textoSeguro(item.querySelector('[data-role="h3"]')?.value);
      const descricao = textoSeguro(item.querySelector('[data-role="p"]')?.value);
      if (!caminho_sistema) throw new Error(`Informe o caminho no sistema do item ${itemIndex + 1} da seção "${titulo}".`);
      if (!descricao) throw new Error(`Informe a descrição do item ${itemIndex + 1} da seção "${titulo}".`);
      return { caminho_sistema, descricao, ordem: itemIndex + 1 };
    });
    if (!itens.length) throw new Error(`A seção "${titulo}" precisa ter pelo menos um item.`);
    return { titulo, ordem: index + 1, itens };
  });
  if (!secoes.length) throw new Error('Adicione pelo menos uma seção.');
  return { modelo_sistema: modeloSelecionado.sigla, versao, data_digitada, secoes };
}

function criarNomeArquivo(dados) {
  const versao = dados.versao.replace(/[^a-zA-Z0-9._-]/g, '_');
  const data = new Date().toISOString().replace(/[:.]/g, '-');
  return `${dados.modelo_sistema}_${versao}_${data}.pdf`;
}

function criarElementoTexto(texto, tag='div', classe='') {
  const el = document.createElement(tag);
  el.className = classe;
  el.textContent = texto;
  return el;
}

function criarCabecalhoPDF(origem) {
  const header = origem.querySelector('header.top').cloneNode(true);
  const versao = textoSeguro(origem.querySelector('.versao-input')?.value);
  const data = textoSeguro(origem.querySelector('.data-input')?.value);
  header.querySelector('.versao-input')?.replaceWith(criarElementoTexto(versao, 'div', 'versao-print'));
  header.querySelector('.data-input')?.replaceWith(criarElementoTexto(data, 'div', 'data-print'));
  header.classList.add('pdf-header');
  return header;
}

function criarRodapePDF(origem) {
  const footer = origem.querySelector('footer.bottom').cloneNode(true);
  footer.classList.add('pdf-footer');
  return footer;
}

function prepararBlocosPDF(origem) {
  const blocos = [];
  const intro = textoSeguro(origem.querySelector('.sub')?.textContent);
  if (intro) blocos.push(criarElementoTexto(intro, 'p', 'sub pdf-intro'));

  origem.querySelectorAll('.secao-editor').forEach(secao => {
    const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);
    blocos.push(criarElementoTexto(titulo, 'div', 'section-title pdf-section-title'));
    secao.querySelectorAll('.item-editor').forEach(item => {
      const card = document.createElement('div');
      card.className = 'item pdf-item';
      card.appendChild(criarElementoTexto(textoSeguro(item.querySelector('[data-role="h3"]')?.value), 'h3'));
      card.appendChild(criarElementoTexto(textoSeguro(item.querySelector('[data-role="p"]')?.value), 'p'));
      blocos.push(card);
    });
  });
  return blocos;
}

function criarPaginaPDF(origem) {
  const pagina = document.createElement('div');
  pagina.className = 'pdf-page';
  pagina.style.width = `${PDF_W}px`;
  pagina.style.height = `${PDF_H}px`;
  pagina.style.minHeight = `${PDF_H}px`;
  pagina.style.maxHeight = `${PDF_H}px`;

  const header = criarCabecalhoPDF(origem);
  const footer = criarRodapePDF(origem);
  const main = document.createElement('main');
  main.className = 'pdf-main';

  pagina.append(header, main, footer);
  document.getElementById('printContainer').appendChild(pagina);

  // Força dimensões exatas e elimina qualquer margem lateral herdada.
  header.style.width = `${PDF_W}px`;
  header.style.margin = '0';
  footer.style.width = `${PDF_W}px`;
  footer.style.margin = '0';
  main.style.width = `${PDF_W}px`;
  main.style.margin = '0';
  main.style.flex = 'none';
  main.style.boxSizing = 'border-box';

  const alturaMain = PDF_H - header.getBoundingClientRect().height - footer.getBoundingClientRect().height;
  main.style.height = `${Math.max(0, alturaMain)}px`;
  main.style.minHeight = `${Math.max(0, alturaMain)}px`;
  main.style.maxHeight = `${Math.max(0, alturaMain)}px`;
  return { pagina, main, alturaDisponivel: Math.max(0, alturaMain) };
}

function criarMedidorBloco(bloco, largura) {
  const medidor = document.createElement('div');
  medidor.className = 'pdf-measure-block';
  medidor.style.width = `${largura}px`;
  medidor.style.position = 'fixed';
  medidor.style.left = '-100000px';
  medidor.style.top = '0';
  medidor.style.visibility = 'hidden';
  medidor.style.pointerEvents = 'none';
  medidor.appendChild(bloco.cloneNode(true));
  document.body.appendChild(medidor);
  const altura = medidor.firstElementChild.getBoundingClientRect().height;
  medidor.remove();
  return altura;
}

async function montarPaginasPDF() {
  const origem = document.querySelector('.page');
  const container = document.getElementById('printContainer');
  if (!origem || !container) throw new Error('Estrutura da página não encontrada.');
  container.innerHTML = '';
  container.className = 'pdf-document';
  const blocos = prepararBlocosPDF(origem);

  let pagina = criarPaginaPDF(origem);
  let alturaUsada = 0;
  const larguraInterna = PDF_W - 64;

  for (const bloco of blocos) {
    const alturaBloco = criarMedidorBloco(bloco, larguraInterna);
    if (alturaUsada > 0 && alturaUsada + alturaBloco > pagina.alturaDisponivel) {
      pagina = criarPaginaPDF(origem);
      alturaUsada = 0;
    }
    pagina.main.appendChild(bloco);
    alturaUsada += alturaBloco;
  }

  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return [...container.querySelectorAll('.pdf-page')];
}

async function gerarPdfBlob() {
  if (typeof html2canvas !== 'function') throw new Error('A biblioteca html2canvas não foi carregada no bundle.');
  const paginas = await montarPaginasPDF();
  await document.fonts?.ready;
  const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait', compress:true });
  const scale = 2;

  for (let i = 0; i < paginas.length; i++) {
    const pagina = paginas[i];
    const canvas = await html2canvas(pagina, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      allowTaint: false,
      width: PDF_W,
      height: PDF_H,
      windowWidth: PDF_W,
      windowHeight: PDF_H,
      scrollX: 0,
      scrollY: 0,
      logging: false
    });
    const imagem = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(imagem, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  return pdf.output('blob');
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function salvarNoServidor(dados, pdfBlob) {
  const pdfBase64 = await blobParaBase64(pdfBlob);
  const nomeArquivo = criarNomeArquivo(dados);
  const resposta = await fetch('/.netlify/functions/salvar-versionamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, nome_arquivo: nomeArquivo, pdf_base64: pdfBase64 })
  });
  let resultado;
  try { resultado = await resposta.json(); }
  catch { throw new Error(`O servidor retornou uma resposta inválida (HTTP ${resposta.status}).`); }
  if (!resposta.ok || !resultado.ok) throw new Error(resultado?.error || 'Não foi possível salvar o versionamento.');
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
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function imprimirPDF() {
  const botao = document.querySelector('.btn-pdf');
  try {
    const dados = coletarDadosVersionamento();
    if (botao) { botao.disabled = true; botao.dataset.textoOriginal = botao.textContent; botao.textContent = 'Gerando e salvando PDF...'; }
    const pdfBlob = await gerarPdfBlob();
    const resultado = await salvarNoServidor(dados, pdfBlob);
    baixarBlob(pdfBlob, resultado.nome_arquivo || criarNomeArquivo(dados));
    document.getElementById('printContainer').innerHTML = '';
    alert('Versionamento salvo com sucesso e PDF armazenado.');
  } catch (erro) {
    console.error('Erro ao gerar/salvar versionamento:', erro);
    alert(erro.message || 'Ocorreu um erro ao gerar ou salvar o versionamento.');
  } finally {
    document.getElementById('printContainer').innerHTML = '';
    if (botao) { botao.disabled = false; botao.textContent = botao.dataset.textoOriginal || 'Gerar / Salvar PDF'; }
  }
}

// O HTML usa onclick. O bundle precisa expor essas funções explicitamente no window.
Object.assign(window, {
  selecionarModelo,
  adicionarSecao,
  adicionarItem,
  removerSecao,
  imprimirPDF
});

adicionarSecao();
