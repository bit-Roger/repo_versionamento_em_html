(() => {
  'use strict';

  const modelos = {
    PCA: {
      sigla: 'PCA',
      nome: 'Prestação de Contas e Auditoria',
      titulo: 'ATUALIZAÇÃO DO SISTEMA PCA',
      introducao:
        'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PCA.'
    },

    CIA: {
      sigla: 'CIA',
      nome: 'Controle Interno e Auditoria',
      titulo: 'ATUALIZAÇÃO DO SISTEMA CIA',
      introducao:
        'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema CIA.'
    },

    PTM: {
      sigla: 'PTM',
      nome: 'Portal da Transparência Municipal',
      titulo: 'ATUALIZAÇÃO DO SISTEMA PTM',
      introducao:
        'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM.'
    },

    PTM_ADM: {
      sigla: 'PTM_ADM',
      nome: 'Portal da Transparência Municipal Administrativo',
      titulo: 'ATUALIZAÇÃO DO SISTEMA PTM_ADM',
      introducao:
        'Confira abaixo as melhorias, correções e novas funcionalidades disponibilizadas nesta atualização do sistema PTM_ADM.'
    }
  };

  let modeloSelecionado = null;
  let contadorSecao = 0;
  let contadorVersao = 0;

  /*
   * Dimensões usadas para a montagem do PDF.
   * 794 x 1123 corresponde aproximadamente a A4 em 96 DPI.
   */
  const PDF_W = 794;
  const PDF_H = 1123;

  const textoSeguro = valor => (valor || '').trim();

  /* =========================================================
     MODELO
     ========================================================= */

  function selecionarModelo(sigla) {
    const modelo = modelos[sigla];

    if (!modelo) return;

    modeloSelecionado = modelo;

    document.title = `Versionamento - ${modelo.sigla}`;

    const tituloSistema = document.getElementById('tituloSistema');
    const nomeSistema = document.getElementById('nomeSistema');
    const textoIntroducao = document.getElementById('textoIntroducao');

    if (tituloSistema) {
      tituloSistema.textContent = modelo.titulo;
    }

    if (nomeSistema) {
      nomeSistema.textContent = modelo.nome;
    }

    if (textoIntroducao) {
      textoIntroducao.textContent = modelo.introducao;
    }

    const overlay = document.getElementById('modeloOverlay');

    if (overlay) {
      overlay.classList.add('fechado');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  /* =========================================================
     VERSÕES
     ========================================================= */

  function adicionarVersao() {
    contadorVersao++;

    const id = contadorVersao;

    const container = document.getElementById('conteudoContainer');

    if (!container) return;

    const div = document.createElement('div');

    div.className = 'versao-editor';
    div.id = `versao-${id}`;

    div.innerHTML = `
      <button
        type="button"
        class="btn-remover btn-remover-versao"
        data-action="remover-versao"
        data-id="${id}">
        remover versão ✕
      </button>

      <label>Versão</label>

      <input
        class="versao-input-item"
        placeholder="Ex.: vX.XX.X"
        data-role="versao">
    `;

    container.appendChild(div);
  }

  function removerVersao(id) {
    const versao = document.getElementById(`versao-${id}`);

    if (versao) {
      versao.remove();
    }
  }

  /* =========================================================
     SEÇÕES
     ========================================================= */

  function adicionarSecao() {
    contadorSecao++;

    const id = contadorSecao;

    const container = document.getElementById('conteudoContainer');

    if (!container) return;

    const div = document.createElement('div');

    div.className = 'secao-editor';
    div.id = `secao-${id}`;

    div.innerHTML = `
      <button
        type="button"
        class="btn-remover remover-secao"
        data-action="remover-secao"
        data-id="${id}">
        remover seção ✕
      </button>

      <input
        class="secao-titulo-input"
        placeholder="Título da seção (ex: Correções)"
        data-role="titulo">

      <div
        class="itens-lista"
        id="itens-${id}">
      </div>

      <div class="linha-botoes">
        <button
          type="button"
          class="btn-item"
          data-action="adicionar-item"
          data-id="${id}">
          + Adicionar item
        </button>
      </div>
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
      <button
        type="button"
        class="btn-remover btn-remover-item"
        data-action="remover-item">
        remover item ✕
      </button>

      <label>Caminho no sistema</label>

      <input
        placeholder="Ex: Cadastros > Fornecedores > Editar"
        data-role="h3">

      <div class="caminho-hint">
        Use > para indicar a setinha entre as telas.
      </div>

      <label>Descrição da mudança</label>

      <textarea
        rows="2"
        placeholder="Descreva o que mudou..."
        data-role="p"></textarea>
    `;

    lista.appendChild(item);
  }

  function removerSecao(id) {
    const secao = document.getElementById(`secao-${id}`);

    if (secao) {
      secao.remove();
    }
  }

  /* =========================================================
     COLETA DOS DADOS
     ========================================================= */

  function coletarDadosVersionamento() {
  if (!modeloSelecionado) {
    throw new Error(
      'Selecione o modelo do sistema antes de gerar o PDF.'
    );
  }

  const versoes = [
    ...document.querySelectorAll('.versao-editor')
  ]
    .map(versao =>
      textoSeguro(
        versao.querySelector('[data-role="versao"]')?.value
      )
    )
    .filter(valor => valor.length > 0);

  if (!versoes.length) {
    throw new Error('Informe pelo menos uma versão.');
  }

  const secoes = [
    ...document.querySelectorAll('.secao-editor')
  ].map((secao, index) => {

    const titulo = textoSeguro(
      secao.querySelector('[data-role="titulo"]')?.value
    );

    if (!titulo) {
      throw new Error(
        `Informe o título da seção ${index + 1}.`
      );
    }

    const itens = [
      ...secao.querySelectorAll('.item-editor')
    ].map((item, itemIndex) => {

      const caminho_sistema = textoSeguro(
        item.querySelector('[data-role="h3"]')?.value
      );

      const descricao = textoSeguro(
        item.querySelector('[data-role="p"]')?.value
      );

      if (!caminho_sistema) {
        throw new Error(
          `Informe o caminho no sistema do item ${
            itemIndex + 1
          } da seção "${titulo}".`
        );
      }

      if (!descricao) {
        throw new Error(
          `Informe a descrição do item ${
            itemIndex + 1
          } da seção "${titulo}".`
        );
      }

      return {
        caminho_sistema,
        descricao,
        ordem: itemIndex + 1
      };
    });

    if (!itens.length) {
      throw new Error(
        `A seção "${titulo}" precisa ter pelo menos um item.`
      );
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
    versoes,
    secoes
  };
}

  /* =========================================================
     NOME DO ARQUIVO
     ========================================================= */

  function criarNomeArquivo(dados) {
  const versao = dados.versoes
    .join('_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  const agora = new Date();

  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();

  const data = `${dia}-${mes}-${ano}`;

  return `${dados.modelo_sistema}_${versao}_${data}.pdf`;
}

  /* =========================================================
     ELEMENTOS DO PDF
     ========================================================= */

  function textoElemento(
    texto,
    tag = 'div',
    classe = ''
  ) {
    const el = document.createElement(tag);

    el.className = classe;
    el.textContent = texto;

    return el;
  }

  /* =========================================================
     CABEÇALHO
     ========================================================= */

  function criarCabecalhoPDF(origem) {
  const headerOriginal =
    origem.querySelector('header.top');

  if (!headerOriginal) {
    throw new Error(
      'Cabeçalho da página não encontrado.'
    );
  }

  const header =
    headerOriginal.cloneNode(true);

  header.classList.add('pdf-header');

  header.style.width = `${PDF_W}px`;
  header.style.boxSizing = 'border-box';
  header.style.flex = '0 0 auto';
  header.style.margin = '0';
  header.style.borderRadius = '0';
  header.style.position = 'relative';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.background = '#7a0c1e';
  header.style.color = '#fff';
  header.style.padding = '24px 32px';

  return header;
}
  /* =========================================================
     RODAPÉ
     ========================================================= */

  function criarRodapePDF(origem) {
    const footerOriginal =
      origem.querySelector('footer.bottom');

    if (!footerOriginal) {
      throw new Error(
        'Rodapé da página não encontrado.'
      );
    }

    const footer =
      footerOriginal.cloneNode(true);

    footer.classList.add('pdf-footer');

    /*
     * O rodapé recebe largura total da página.
     * Ele será criado NOVAMENTE em todas as páginas.
     */

    footer.style.width = `${PDF_W}px`;
    footer.style.boxSizing = 'border-box';
    footer.style.flex = '0 0 auto';
    footer.style.margin = '0';
    footer.style.borderRadius = '0';
    footer.style.background = '#7a0c1e';
    footer.style.color = '#fff';
    footer.style.padding = '16px 32px';
    footer.style.display = 'flex';
    footer.style.alignItems = 'center';
    footer.style.justifyContent = 'space-between';

    return footer;
  }

  /* =========================================================
     BLOCOS DO CONTEÚDO
     ========================================================= */

  function prepararBlocosPDF(origem) {
    const blocos = [];

    const intro = textoSeguro(
      origem.querySelector('.sub')?.textContent
    );

    if (intro) {
      const introducao =
        textoElemento(
          intro,
          'p',
          'sub pdf-intro'
        );

      introducao.style.margin =
        '0 0 28px 0';

      introducao.style.color =
        '#6b6b6b';

      introducao.style.fontSize =
        '15px';

      introducao.style.lineHeight =
        '1.5';

      blocos.push(introducao);
    }

    /* =========================================================
   VERSÕES
   As versões ficam acima das seções e lado a lado.
   ========================================================= */

const versoes = [
  ...origem.querySelectorAll('.versao-editor')
]
  .map(versao =>
    textoSeguro(
      versao.querySelector('[data-role="versao"]')?.value
    )
  )
  .filter(valor => valor.length > 0);

if (versoes.length) {
  const versoesWrap =
    document.createElement('div');

  versoesWrap.className =
    'pdf-versoes-topo';

  versoes.forEach(versao => {
    const versaoElemento =
      textoElemento(
        versao,
        'div',
        'versao-print'
      );

    versoesWrap.appendChild(
      versaoElemento
    );
  });

  blocos.push(versoesWrap);
}

    origem
      .querySelectorAll('.secao-editor')
      .forEach(secao => {
        const titulo = textoSeguro(
          secao.querySelector(
            '[data-role="titulo"]'
          )?.value
        );

        const tituloElemento =
          textoElemento(
            titulo,
            'div',
            'section-title pdf-section-title'
          );

        tituloElemento.style.background =
          '#7a0c1e';

        tituloElemento.style.color =
          '#fff';

        tituloElemento.style.fontWeight =
          '700';

        tituloElemento.style.fontSize =
          '14px';

        tituloElemento.style.letterSpacing =
          '0.5px';

        tituloElemento.style.padding =
          '10px 16px';

        tituloElemento.style.borderRadius =
          '4px';

        tituloElemento.style.margin =
          '0 0 12px 0';

        tituloElemento.style.width =
          '100%';

        tituloElemento.style.boxSizing =
          'border-box';

        blocos.push(tituloElemento);

        secao
          .querySelectorAll('.item-editor')
          .forEach(item => {
            const card =
              document.createElement('div');

            card.className =
              'item pdf-item';

            card.style.background =
              '#fbeef0';

            card.style.borderLeft =
              '4px solid #990800';

            card.style.borderRadius =
              '4px';

            card.style.padding =
              '12px 16px';

            card.style.margin =
              '0 0 10px 0';

            card.style.width =
              '100%';

            card.style.boxSizing =
              'border-box';

            card.style.breakInside =
              'avoid';

            card.style.pageBreakInside =
              'avoid';

            const caminho =
              textoSeguro(
                item.querySelector(
                  '[data-role="h3"]'
                )?.value
              );

            const descricao =
              textoSeguro(
                item.querySelector(
                  '[data-role="p"]'
                )?.value
              );

            const h3 =
              textoElemento(
                caminho,
                'h3'
              );

            h3.style.fontSize =
              '14px';

            h3.style.color =
              '#990800';

            h3.style.margin =
              '0 0 4px 0';

            h3.style.lineHeight =
              '1.4';

            h3.style.fontWeight =
              '700';

            h3.style.wordBreak =
              'break-word';

            const p =
              textoElemento(
                descricao,
                'p'
              );

            p.style.fontSize =
              '13.5px';

            p.style.color =
              '#000';

            p.style.margin =
              '0';

            p.style.lineHeight =
              '1.5';

            p.style.whiteSpace =
              'pre-wrap';

            p.style.wordBreak =
              'break-word';

            card.appendChild(h3);
            card.appendChild(p);

            blocos.push(card);
          });
      });

    return blocos;
  }

  /* =========================================================
     CRIAÇÃO DE UMA PÁGINA
     ========================================================= */

  function criarPaginaPDF(origem) {
    const container =
      document.getElementById(
        'printContainer'
      );

    if (!container) {
      throw new Error(
        'Container do PDF não encontrado.'
      );
    }

    const pagina =
      document.createElement('div');

    pagina.className =
      'pdf-page';

    /*
     * A página é construída completamente
     * via JavaScript.
     */

    pagina.style.width =
      `${PDF_W}px`;

    pagina.style.height =
      `${PDF_H}px`;

    pagina.style.minHeight =
      `${PDF_H}px`;

    pagina.style.maxHeight =
      `${PDF_H}px`;

    pagina.style.boxSizing =
      'border-box';

    pagina.style.background =
      '#fff';

    pagina.style.margin =
      '0';

    pagina.style.padding =
      '0';

    pagina.style.display =
      'flex';

    pagina.style.flexDirection =
      'column';

    pagina.style.overflow =
      'hidden';

    pagina.style.position =
      'relative';

    pagina.style.borderRadius =
      '0';

    const header =
      criarCabecalhoPDF(origem);

    const footer =
      criarRodapePDF(origem);

    const main =
      document.createElement('main');

    main.className =
      'pdf-main';

    main.style.width =
      `${PDF_W}px`;

    main.style.boxSizing =
      'border-box';

    main.style.padding =
      '32px';

    main.style.margin =
      '0';

    main.style.flex =
      '0 0 auto';

    main.style.overflow =
      'hidden';

    main.style.background =
      '#fff';

    pagina.appendChild(header);
    pagina.appendChild(main);
    pagina.appendChild(footer);

    container.appendChild(pagina);

    /*
     * Mede o tamanho REAL do cabeçalho e rodapé.
     */

    const h =
      header.getBoundingClientRect()
        .height;

    const f =
      footer.getBoundingClientRect()
        .height;

    const disponivel =
      Math.max(
        1,
        PDF_H - h - f
      );

    main.style.height =
      `${disponivel}px`;

    main.style.minHeight =
      `${disponivel}px`;

    main.style.maxHeight =
      `${disponivel}px`;

    return {
      pagina,
      main,
      alturaDisponivel:
        disponivel
    };
  }

  /* =========================================================
     MEDIÇÃO DOS BLOCOS
     ========================================================= */

  function medirBloco(bloco) {
    const medidor =
      document.createElement('div');

    medidor.className =
      'pdf-measure-block';

    medidor.style.position =
      'absolute';

    medidor.style.left =
      '-100000px';

    medidor.style.top =
      '0';

    medidor.style.width =
      `${PDF_W - 64}px`;

    medidor.style.visibility =
      'hidden';

    medidor.style.pointerEvents =
      'none';

    medidor.style.display =
      'block';

    medidor.style.boxSizing =
      'border-box';

    const copia =
      bloco.cloneNode(true);

    medidor.appendChild(copia);

    document.body.appendChild(
      medidor
    );

    const altura =
      Math.ceil(
        copia.getBoundingClientRect()
          .height
      );

    medidor.remove();

    return altura;
  }

  /* =========================================================
     AGUARDA AS IMAGENS
     ========================================================= */

  async function aguardarImagens(container) {
    const imagens =
      [...container.querySelectorAll('img')];

    await Promise.all(
      imagens.map(img => {
        if (img.complete) {
          return Promise.resolve();
        }

        return new Promise(resolve => {
          img.addEventListener(
            'load',
            resolve,
            { once: true }
          );

          img.addEventListener(
            'error',
            resolve,
            { once: true }
          );
        });
      })
    );
  }

  /* =========================================================
     MONTA TODAS AS PÁGINAS
     ========================================================= */

  async function montarPaginasPDF() {
    const origem =
      document.querySelector('.page');

    const container =
      document.getElementById(
        'printContainer'
      );

    if (!origem) {
      throw new Error(
        'Estrutura da página não encontrada.'
      );
    }

    if (!container) {
      throw new Error(
        'Container de PDF não encontrado.'
      );
    }

    /*
     * ESTA É UMA DAS CORREÇÕES PRINCIPAIS.
     *
     * O CSS original possui:
     *
     * #printContainer {
     *   display: none;
     * }
     *
     * Como não estamos usando window.print(),
     * @media print não entra em ação.
     *
     * Portanto o container precisa ser explicitamente
     * tornado renderizável.
     */

    container.innerHTML = '';

    container.style.display =
      'block';

    container.style.position =
      'absolute';

    container.style.left =
      '-10000px';

    container.style.top =
      '0';

    container.style.width =
      `${PDF_W}px`;

    container.style.minWidth =
      `${PDF_W}px`;

    container.style.padding =
      '0';

    container.style.margin =
      '0';

    container.style.background =
      '#fff';

    container.style.visibility =
      'visible';

    container.style.opacity =
      '1';

    container.style.pointerEvents =
      'none';

    container.style.zIndex =
      '999999';

    /*
     * Garante que o elemento seja realmente renderizado.
     */

    container.offsetHeight;

    const blocos =
      prepararBlocosPDF(origem);

    let pagina =
      criarPaginaPDF(origem);

    let usado = 0;

    for (const bloco of blocos) {
      const altura =
        medirBloco(bloco);

      /*
       * Se o bloco não cabe na página atual,
       * cria uma nova página.
       */

      if (
        usado > 0 &&
        usado + altura >
          pagina.alturaDisponivel
      ) {
        pagina =
          criarPaginaPDF(origem);

        usado = 0;
      }

      pagina.main.appendChild(
        bloco
      );

      usado += altura;
    }

    await aguardarImagens(
      container
    );

    /*
     * Aguarda o navegador terminar o layout.
     */

    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    return [
      ...container.querySelectorAll(
        '.pdf-page'
      )
    ];
  }

  /* =========================================================
     GERA O PDF
     ========================================================= */

  async function gerarPdfBlob() {
    const html2canvasFn =
      window.html2canvas;

    const JsPDF =
      window.jspdf?.jsPDF;

    if (
      typeof html2canvasFn !==
      'function'
    ) {
      throw new Error(
        'A biblioteca html2canvas não foi carregada. Verifique se libs/html2canvas.min.js está publicada.'
      );
    }

    if (
      typeof JsPDF !== 'function'
    ) {
      throw new Error(
        'A biblioteca jsPDF não foi carregada. Verifique se libs/jspdf.umd.min.js está publicada.'
      );
    }

    const paginas =
      await montarPaginasPDF();

    if (!paginas.length) {
      throw new Error(
        'Não foi possível montar as páginas do PDF.'
      );
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pdf =
      new JsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      });

    for (
      let i = 0;
      i < paginas.length;
      i++
    ) {
      const pagina =
        paginas[i];

      /*
       * Garante que a página esteja
       * renderizável antes da captura.
       */

      pagina.style.visibility =
        'visible';

      pagina.style.display =
        'flex';

      const canvas =
        await html2canvasFn(
          pagina,
          {
            backgroundColor: '#fff',

            scale: 2,

            useCORS: true,

            allowTaint: false,

            width: PDF_W,

            height: PDF_H,

            windowWidth: PDF_W,

            windowHeight: PDF_H,

            scrollX: 0,

            scrollY: 0,

            logging: false
          }
        );

      if (i > 0) {
        pdf.addPage(
          'a4',
          'portrait'
        );
      }

      pdf.addImage(
        canvas.toDataURL(
          'image/jpeg',
          0.95
        ),
        'JPEG',
        0,
        0,
        210,
        297,
        undefined,
        'FAST'
      );
    }

    return pdf.output('blob');
  }

  /* =========================================================
     BLOB → BASE64
     ========================================================= */

  function blobParaBase64(blob) {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () => {
          resolve(
            String(
              reader.result
            ).split(',')[1]
          );
        };

        reader.onerror =
          reject;

        reader.readAsDataURL(
          blob
        );
      }
    );
  }

  /* =========================================================
     SALVA NO SERVIDOR / SUPABASE
     ========================================================= */

  async function salvarNoServidor(
    dados,
    pdfBlob
  ) {
    const pdfBase64 =
      await blobParaBase64(
        pdfBlob
      );

    const nomeArquivo =
      criarNomeArquivo(
        dados
      );

    const resposta =
      await fetch(
        '/.netlify/functions/salvar-versionamento',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            ...dados,
            nome_arquivo:
              nomeArquivo,
            pdf_base64:
              pdfBase64
          })
        }
      );

    const resultado =
      await resposta
        .json()
        .catch(() => null);

    if (
      !resposta.ok ||
      !resultado?.ok
    ) {
      throw new Error(
        resultado?.error ||
          `O servidor retornou HTTP ${resposta.status}.`
      );
    }

    return resultado;
  }

  /* =========================================================
     DOWNLOAD DO PDF
     ========================================================= */

  function baixarBlob(
    blob,
    nome
  ) {
    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        'a'
      );

    a.href = url;

    a.download = nome;

    a.style.display =
      'none';

    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 1500);
  }

  /* =========================================================
     GERAR / SALVAR
     ========================================================= */

  async function imprimirPDF() {
    const botao =
      document.querySelector(
        '.btn-pdf'
      );

    const original =
      botao?.textContent ||
      'Gerar / Salvar PDF';

    try {
      const dados =
        coletarDadosVersionamento();

      if (botao) {
        botao.disabled = true;

        botao.textContent =
          'Gerando e salvando PDF...';
      }

      /*
       * Gera o PDF sem window.print().
       */

      const blob =
        await gerarPdfBlob();

      /*
       * Salva versionamento,
       * seções, itens e PDF
       * no servidor/Supabase.
       */

      const resultado =
        await salvarNoServidor(
          dados,
          blob
        );

      /*
       * Depois que o servidor confirmar,
       * baixa o PDF para o usuário.
       */

      baixarBlob(
        blob,
        resultado.nome_arquivo ||
          criarNomeArquivo(
            dados
          )
      );

      alert(
        'Versionamento salvo com sucesso e PDF armazenado.'
      );
    } catch (erro) {
      console.error(
        'Erro ao gerar/salvar PDF:',
        erro
      );

      alert(
        erro?.message ||
          'Ocorreu um erro ao gerar ou salvar o versionamento.'
      );
    } finally {
      /*
       * Limpa completamente o conteúdo
       * temporário usado para gerar o PDF.
       */

      const container =
        document.getElementById(
          'printContainer'
        );

      if (container) {
        container.innerHTML = '';

        /*
         * Volta para o estado original.
         */

        container.style.display =
          'none';

        container.style.position =
          '';

        container.style.left =
          '';

        container.style.top =
          '';

        container.style.width =
          '';

        container.style.minWidth =
          '';

        container.style.padding =
          '';

        container.style.margin =
          '';

        container.style.background =
          '';

        container.style.visibility =
          '';

        container.style.opacity =
          '';

        container.style.pointerEvents =
          '';

        container.style.zIndex =
          '';
      }

      if (botao) {
        botao.disabled = false;

        botao.textContent =
          original;
      }
    }
  }

  /* =========================================================
     EVENTOS
     ========================================================= */

  function configurarEventos() {
    const overlay =
      document.getElementById(
        'modeloOverlay'
      );

    overlay?.addEventListener(
      'click',
      e => {
        const btn =
          e.target.closest(
            '[data-modelo]'
          );

        if (btn) {
          selecionarModelo(
            btn.dataset.modelo
          );
        }
      }
    );

    document
      .getElementById(
        'btnAdicionarVersao'
      )
      ?.addEventListener(
        'click',
        adicionarVersao
      );

    document
  .getElementById('conteudoContainer')
  ?.addEventListener(
    'click',
    e => {

      const btn = e.target.closest('[data-action]');

      if (!btn) return;

      const acao = btn.dataset.action;

      /* =========================
         REMOVER VERSÃO
         ========================= */

      if (acao === 'remover-versao') {

        removerVersao(
          Number(btn.dataset.id)
        );

        return;
      }


      /* =========================
         REMOVER SEÇÃO
         ========================= */

      if (acao === 'remover-secao') {

        removerSecao(
          Number(btn.dataset.id)
        );

        return;
      }


      /* =========================
         ADICIONAR ITEM
         ========================= */

      if (acao === 'adicionar-item') {

        adicionarItem(
          Number(btn.dataset.id)
        );

        return;
      }


      /* =========================
         REMOVER ITEM
         ========================= */

      if (acao === 'remover-item') {

        const item =
          btn.closest('.item-editor');

        if (item) {
          item.remove();
        }

        return;
      }

    }
  );

    document
      .getElementById(
        'btnAdicionarSecao'
      )
      ?.addEventListener(
        'click',
        adicionarSecao
      );

    document
      .getElementById(
        'btnGerarPDF'
      )
      ?.addEventListener(
        'click',
        imprimirPDF
      );

 

    /*
     * Cria a primeira versão e a primeira seção
     * automaticamente.
     */

    adicionarVersao();
  }

  /* =========================================================
     COMPATIBILIDADE COM HTML ANTIGO
     ========================================================= */

  Object.assign(
    window,
    {
      selecionarModelo,
      adicionarVersao,
      removerVersao,
      adicionarSecao,
      adicionarItem,
      removerSecao,
      imprimirPDF
    }
  );

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      configurarEventos
    );
  } else {
    configurarEventos();
  }

})();