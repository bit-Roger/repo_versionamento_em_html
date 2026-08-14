(() => {
  'use strict';

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
      overlay.classList.add('fechado');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function adicionarSecao() {
    contadorSecao++;
    const id = contadorSecao;
    const container = document.getElementById('secoesContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'secao-editor';
    div.id = `secao-${id}`;
    div.innerHTML = `
      <button type="button" class="btn-remover remover-secao" data-action="remover-secao" data-id="${id}">remover seção ✕</button>
      <input class="secao-titulo-input" placeholder="Título da seção (ex: Correções)" data-role="titulo">
      <div class="itens-lista" id="itens-${id}"></div>
      <div class="linha-botoes"><button type="button" class="btn-item" data-action="adicionar-item" data-id="${id}">+ Adicionar item</button></div>
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
      <button type="button" class="btn-remover btn-remover-item" data-action="remover-item">remover item ✕</button>
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

  function textoElemento(texto, tag='div', classe='') {
    const el = document.createElement(tag);
    el.className = classe;
    el.textContent = texto;
    return el;
  }

  function criarCabecalhoPDF(origem) {
    const header = origem.querySelector('header.top').cloneNode(true);
    const versao = textoSeguro(origem.querySelector('.versao-input')?.value);
    const data = textoSeguro(origem.querySelector('.data-input')?.value);
    const vi = header.querySelector('.versao-input');
    const di = header.querySelector('.data-input');
    if (vi) vi.replaceWith(textoElemento(versao, 'div', 'versao-print'));
    if (di) di.replaceWith(textoElemento(data, 'div', 'data-print'));
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
    if (intro) blocos.push(textoElemento(intro, 'p', 'sub pdf-intro'));
    origem.querySelectorAll('.secao-editor').forEach(secao => {
      const titulo = textoSeguro(secao.querySelector('[data-role="titulo"]')?.value);
      blocos.push(textoElemento(titulo, 'div', 'section-title pdf-section-title'));
      secao.querySelectorAll('.item-editor').forEach(item => {
        const card = document.createElement('div');
        card.className = 'item pdf-item';
        card.appendChild(textoElemento(textoSeguro(item.querySelector('[data-role="h3"]')?.value), 'h3'));
        card.appendChild(textoElemento(textoSeguro(item.querySelector('[data-role="p"]')?.value), 'p'));
        blocos.push(card);
      });
    });
    return blocos;
  }

  function criarPaginaPDF(origem) {
    const pagina = document.createElement('div');
    pagina.className = 'pdf-page';
    const header = criarCabecalhoPDF(origem);
    const footer = criarRodapePDF(origem);
    const main = document.createElement('main');
    main.className = 'pdf-main';
    pagina.append(header, main, footer);
    document.getElementById('printContainer').appendChild(pagina);
    const h = header.getBoundingClientRect().height;
    const f = footer.getBoundingClientRect().height;
    const disponivel = Math.max(1, PDF_H - h - f);
    main.style.height = `${disponivel}px`;
    main.style.minHeight = `${disponivel}px`;
    main.style.maxHeight = `${disponivel}px`;
    return { pagina, main, alturaDisponivel: disponivel };
  }

  function medirBloco(bloco) {
    const medidor = document.createElement('div');
    medidor.className = 'pdf-measure-block';
    medidor.style.cssText = `position:fixed;left:-100000px;top:0;width:${PDF_W - 64}px;visibility:hidden;pointer-events:none;display:block;`;
    const copia = bloco.cloneNode(true);
    medidor.appendChild(copia);
    document.body.appendChild(medidor);
    const altura = copia.getBoundingClientRect().height;
    medidor.remove();
    return altura;
  }

  async function montarPaginasPDF() {
    const origem = document.querySelector('.page');
    const container = document.getElementById('printContainer');
    if (!origem || !container) throw new Error('Estrutura da página não encontrada.');
    container.innerHTML = '';
    const blocos = prepararBlocosPDF(origem);
    let pagina = criarPaginaPDF(origem);
    let usado = 0;
    for (const bloco of blocos) {
      const altura = medirBloco(bloco);
      if (usado > 0 && usado + altura > pagina.alturaDisponivel) {
        pagina = criarPaginaPDF(origem);
        usado = 0;
      }
      pagina.main.appendChild(bloco);
      usado += altura;
    }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...container.querySelectorAll('.pdf-page')];
  }

  async function gerarPdfBlob() {
    const html2canvasFn = window.html2canvas;
    const JsPDF = window.jspdf?.jsPDF;
    if (typeof html2canvasFn !== 'function' || typeof JsPDF !== 'function') {
      throw new Error('As bibliotecas locais de PDF não foram carregadas. Faça um novo deploy da versão atualizada.');
    }
    const paginas = await montarPaginasPDF();
    if (!paginas.length) throw new Error('Não foi possível montar as páginas do PDF.');
    await document.fonts?.ready;
    const pdf = new JsPDF({ unit:'mm', format:'a4', orientation:'portrait', compress:true });
    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvasFn(paginas[i], {
        backgroundColor:'#fff', scale:2, useCORS:true, allowTaint:false,
        width:PDF_W, height:PDF_H, windowWidth:PDF_W, windowHeight:PDF_H,
        scrollX:0, scrollY:0, logging:false
      });
      if (i > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
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
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...dados, nome_arquivo:nomeArquivo, pdf_base64:pdfBase64})
    });
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok || !resultado?.ok) throw new Error(resultado?.error || `O servidor retornou HTTP ${resposta.status}.`);
    return resultado;
  }

  function baixarBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function imprimirPDF() {
    const botao = document.querySelector('.btn-pdf');
    const original = botao?.textContent || 'Gerar / Salvar PDF';
    try {
      const dados = coletarDadosVersionamento();
      if (botao) { botao.disabled=true; botao.textContent='Gerando e salvando PDF...'; }
      const blob = await gerarPdfBlob();
      const resultado = await salvarNoServidor(dados, blob);
      baixarBlob(blob, resultado.nome_arquivo || criarNomeArquivo(dados));
      alert('Versionamento salvo com sucesso e PDF armazenado.');
    } catch (erro) {
      console.error(erro);
      alert(erro?.message || 'Ocorreu um erro ao gerar ou salvar o versionamento.');
    } finally {
      const c = document.getElementById('printContainer');
      if (c) c.innerHTML='';
      if (botao) { botao.disabled=false; botao.textContent=original; }
    }
  }

  function configurarEventos() {
    const overlay = document.getElementById('modeloOverlay');
    overlay?.addEventListener('click', e => {
      const btn = e.target.closest('[data-modelo]');
      if (btn) selecionarModelo(btn.dataset.modelo);
    });
    document.getElementById('btnAdicionarSecao')?.addEventListener('click', adicionarSecao);
    document.getElementById('btnGerarPDF')?.addEventListener('click', imprimirPDF);
    document.getElementById('secoesContainer')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'adicionar-item') adicionarItem(Number(btn.dataset.id));
      if (action === 'remover-secao') removerSecao(Number(btn.dataset.id));
      if (action === 'remover-item') btn.closest('.item-editor')?.remove();
    });
    adicionarSecao();
  }

  // Mantém compatibilidade com qualquer HTML antigo que ainda use onclick.
  Object.assign(window, { selecionarModelo, adicionarSecao, adicionarItem, removerSecao, imprimirPDF });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', configurarEventos);
  else configurarEventos();
})();
