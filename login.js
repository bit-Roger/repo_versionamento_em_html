(() => {
  'use strict';

  /*
   * Mesmas regras de netlify/lib/auth.mjs e supabase-login.sql.
   * Usuário: nome.sobrenome (ex.: roger.penha, teste.setor1).
   */
  const REGRA_USUARIO = /^[a-z0-9]+\.[a-z0-9]+$/;

  const REGRAS_SENHA = [
    ['tamanho', s => s.length >= 8 && s.length <= 72],
    ['maiuscula', s => /[A-Z]/.test(s)],
    ['minuscula', s => /[a-z]/.test(s)],
    ['numero', s => /[0-9]/.test(s)],
    ['especial', s => /[^A-Za-z0-9]/.test(s)]
  ];

  const senhaValida = senha => REGRAS_SENHA.every(([, teste]) => teste(senha));
  const normalizarUsuario = usuario => String(usuario || '').trim().toLowerCase();

  const $ = id => document.getElementById(id);

  /*
   * Se qualquer função do site responder 401 (sessão vencida),
   * reabre a tela de login sem perder o que está no editor.
   */
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const resposta = await fetchOriginal(...args);
    const url = String(args[0]?.url || args[0] || '');

    if (
      resposta.status === 401 &&
      url.includes('/.netlify/functions/') &&
      !url.includes('/.netlify/functions/login')
    ) {
      mostrarLogin('Sua sessão expirou. Entre novamente e tente de novo.');
    }

    return resposta;
  };

  async function enviar(url, dados) {
    const resposta = await fetchOriginal(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados || {})
    });

    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok || !resultado?.ok) {
      throw new Error(resultado?.error || `O servidor retornou HTTP ${resposta.status}.`);
    }

    return resultado;
  }

  /* =========================================================
     TELA DE LOGIN
     ========================================================= */

  function mostrarLogin(mensagem = '') {
    const overlay = $('loginOverlay');

    overlay.classList.remove('fechado');
    overlay.setAttribute('aria-hidden', 'false');
    $('barraUsuario').hidden = true;
    $('loginErro').textContent = mensagem;
    $('loginSenha').value = '';
    $('loginUsuario').focus();
  }

  function entrar(usuario) {
    const overlay = $('loginOverlay');

    overlay.classList.add('fechado');
    overlay.setAttribute('aria-hidden', 'true');
    $('usuarioLogado').textContent = usuario;
    $('barraUsuario').hidden = false;
  }

  async function enviarLogin(evento) {
    evento.preventDefault();

    const usuario = normalizarUsuario($('loginUsuario').value);
    const senha = $('loginSenha').value;
    const erro = $('loginErro');
    const botao = $('btnEntrar');

    if (!REGRA_USUARIO.test(usuario)) {
      erro.textContent = 'Usuário deve estar no formato nome.sobrenome (ex.: roger.penha).';
      return;
    }

    if (!senhaValida(senha)) {
      erro.textContent = 'Usuário ou senha incorretos.';
      return;
    }

    erro.textContent = '';
    botao.disabled = true;

    try {
      const resultado = await enviar('/.netlify/functions/login', { usuario, senha });
      entrar(resultado.usuario);
    } catch (e) {
      erro.textContent = e.message;
    } finally {
      botao.disabled = false;
      $('loginSenha').value = '';
    }
  }

  async function sair() {
    try {
      await enviar('/.netlify/functions/logout');
    } catch (e) {
      console.error('Erro ao sair:', e);
    }

    // Recarrega para limpar o editor.
    window.location.reload();
  }

  /* =========================================================
     NOVO USUÁRIO
     ========================================================= */

  function atualizarRegrasSenha() {
    const senha = $('novoSenha').value;

    for (const [regra, teste] of REGRAS_SENHA) {
      document
        .querySelector(`#regrasSenha [data-regra="${regra}"]`)
        ?.classList.toggle('ok', teste(senha));
    }
  }

  function abrirNovoUsuario() {
    $('formNovoUsuario').reset();
    $('novoUsuarioMsg').textContent = '';
    $('novoUsuarioMsg').classList.remove('sucesso');
    atualizarRegrasSenha();
    $('novoUsuarioOverlay').classList.remove('fechado');
    $('novoUsuarioOverlay').setAttribute('aria-hidden', 'false');
    $('novoUsuario').focus();
  }

  function fecharNovoUsuario() {
    $('novoUsuarioOverlay').classList.add('fechado');
    $('novoUsuarioOverlay').setAttribute('aria-hidden', 'true');
  }

  async function criarUsuario(evento) {
    evento.preventDefault();

    const usuario = normalizarUsuario($('novoUsuario').value);
    const senha = $('novoSenha').value;
    const msg = $('novoUsuarioMsg');
    const botao = $('btnCriarUsuario');

    msg.classList.remove('sucesso');

    if (!REGRA_USUARIO.test(usuario)) {
      msg.textContent = 'Usuário deve estar no formato nome.sobrenome (ex.: roger.penha).';
      return;
    }

    if (!senhaValida(senha)) {
      msg.textContent = 'A senha não atende a todas as regras abaixo.';
      return;
    }

    if (senha !== $('novoSenhaConfirma').value) {
      msg.textContent = 'As senhas não conferem.';
      return;
    }

    botao.disabled = true;

    try {
      await enviar('/.netlify/functions/criar-usuario', { usuario, senha });
      $('formNovoUsuario').reset();
      atualizarRegrasSenha();
      msg.textContent = `Usuário ${usuario} criado.`;
      msg.classList.add('sucesso');
    } catch (e) {
      msg.textContent = e.message;
    } finally {
      botao.disabled = false;
    }
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  async function iniciar() {
    $('formLogin').addEventListener('submit', enviarLogin);
    $('btnSair').addEventListener('click', sair);
    $('btnNovoUsuario').addEventListener('click', abrirNovoUsuario);
    $('btnFecharNovoUsuario').addEventListener('click', fecharNovoUsuario);
    $('formNovoUsuario').addEventListener('submit', criarUsuario);
    $('novoSenha').addEventListener('input', atualizarRegrasSenha);

    try {
      const resposta = await fetchOriginal('/.netlify/functions/sessao');
      const resultado = await resposta.json().catch(() => null);

      if (resposta.ok && resultado?.ok) {
        entrar(resultado.usuario);
        return;
      }
    } catch (e) {
      console.error('Erro ao verificar login:', e);
    }

    mostrarLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
