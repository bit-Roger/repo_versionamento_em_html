
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
let contadorSecao = 0;

function adicionarSecao(){
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

function adicionarItem(secaoId){
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

function removerSecao(id){
  document.getElementById('secao-' + id).remove();
}

function textoSeguro(valor){
  return (valor || '').trim();
}

function criarTexto(parent, texto, classe){
  const el = document.createElement('span');
  el.className = 'print-value ' + (classe || '');
  el.textContent = texto;
  return el;
}

function montarDocumentoImpressao(){
  const origem = document.querySelector('.page');
  const container = document.getElementById('printContainer');

  // Copia a página real para preservar exatamente o visual do site.
  const copia = origem.cloneNode(true);

  // Remove todos os controles que nunca devem aparecer no PDF.
  copia.querySelectorAll('button, .linha-botoes, .caminho-hint, label').forEach(el => el.remove());

  // Versão: imprime exatamente o valor digitado.
  const versaoOriginal = origem.querySelector('.versao-input');
  const versaoDestino = copia.querySelector('.versao-input');

  if (versaoDestino){
    const valor = textoSeguro(versaoOriginal ? versaoOriginal.value : '');
    const texto = criarTexto(document.createElement('div'), valor, 'versao-print');
    versaoDestino.replaceWith(texto);
  }

  // Data: imprime exatamente o valor digitado.
  const dataOriginal = origem.querySelector('.data-input');
  const dataDestino = copia.querySelector('.data-input');

  if (dataDestino){
    const valor = textoSeguro(dataOriginal ? dataOriginal.value : '');
    const texto = criarTexto(document.createElement('div'), valor, 'data-print');
    dataDestino.replaceWith(texto);
  }

  // Títulos das seções.
  const secoesOrigem = origem.querySelectorAll('.secao-editor');
  const secoesDestino = copia.querySelectorAll('.secao-editor');

  secoesOrigem.forEach((secao, indice) => {
    const destino = secoesDestino[indice];
    if (!destino) return;

    const tituloOrigem = secao.querySelector('[data-role="titulo"]');
    const tituloDestino = destino.querySelector('[data-role="titulo"]');

    if (tituloDestino){
      const texto = criarTexto(
        document.createElement('div'),
        textoSeguro(tituloOrigem ? tituloOrigem.value : ''),
        ''
      );
      texto.className = 'section-title';
      tituloDestino.replaceWith(texto);
    }

    // Itens: mantém todos os adicionados, editados e removidos no estado atual.
    const itensOrigem = secao.querySelectorAll('.item-editor');
    const itensDestino = destino.querySelectorAll('.item-editor');

    itensOrigem.forEach((item, itemIndex) => {
      const itemDestino = itensDestino[itemIndex];
      if (!itemDestino) return;

      const h3Origem = item.querySelector('[data-role="h3"]');
      const pOrigem = item.querySelector('[data-role="p"]');

      const h3Destino = itemDestino.querySelector('[data-role="h3"]');
      const pDestino = itemDestino.querySelector('[data-role="p"]');

      if (h3Destino){
        h3Destino.replaceWith(
          criarTexto(
            document.createElement('div'),
            textoSeguro(h3Origem ? h3Origem.value : ''),
            ''
          )
        );
      }

      if (pDestino){
        const p = document.createElement('p');
        p.className = 'print-value';
        p.textContent = textoSeguro(pOrigem ? pOrigem.value : '');
        pDestino.replaceWith(p);
      }
    });
  });

  // Garante que o conteúdo da introdução usado na tela seja o mesmo no PDF.
  const introTela = origem.querySelector('.sub');
  const introPDF = copia.querySelector('.sub');
  if (introTela && introPDF){
    introPDF.textContent = textoSeguro(introTela.textContent);
  }

  container.innerHTML = '';
  container.appendChild(copia);
}

function imprimirPDF(){
  const container = document.getElementById('printContainer');

  // O container de impressão precisa ficar diretamente no <body>.
  // Se permanecer dentro de .page, o CSS de impressão esconderia
  // o próprio container junto com a página original.
  if (container.parentElement !== document.body){
    document.body.appendChild(container);
  }

  montarDocumentoImpressao();

  // Aguarda o navegador aplicar o clone e renderizar o conteúdo.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

window.addEventListener('afterprint', () => {
  const container = document.getElementById('printContainer');
  const originalPage = document.querySelector('body > .page');

  if (container){
    container.innerHTML = '';
    if (originalPage){
      originalPage.appendChild(container);
    }
  }
});

adicionarSecao();