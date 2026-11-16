/**
 * sessao.js
 * Guarda o token JWT e os dados do usuário logado no localStorage do
 * navegador (sobrevive a reloads, mas é só desse navegador). Carregar
 * este script ANTES de api.js: ele é quem decide se uma requisição sai
 * com "Authorization: Bearer ...".
 */

const CHAVE_SESSAO = 'pastelaria_sessao';

function salvarSessao(sessao) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

function obterSessao() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
        return null;
    }
}

function limparSessao() {
    localStorage.removeItem(CHAVE_SESSAO);
}

function estaLogado() {
    return !!obterSessao()?.token;
}

function obterUsuarioLogado() {
    return obterSessao()?.usuario ?? null;
}

function ehAdministrador() {
    return obterUsuarioLogado()?.tipo === 'ADMINISTRADOR';
}

function ehCliente() {
    return estaLogado() && obterUsuarioLogado()?.tipo === 'CLIENTE';
}

/** Chame no topo de uma página que só pode ser vista por quem está logado. */
function exigirLogin() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
    }
}

/** Chame no topo de uma página administrativa. */
function exigirAdministrador() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
        return;
    }
    if (!ehAdministrador()) {
        alert('Essa área é restrita a administradores.');
        window.location.href = 'index.html';
    }
}

/**
 * Chame no topo de uma página exclusiva para clientes (Carrinho e Acompanhamento).
 * Usuários administradores e visitantes não autenticados são impedidos de acessar.
 */
function exigirCliente() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
        return;
    }
    if (ehAdministrador() || obterUsuarioLogado()?.tipo !== 'CLIENTE') {
        alert('Essa área é exclusiva para clientes. Administradores não têm acesso.');
        window.location.href = 'index.html';
    }
}

/**
 * Ajusta a nav de cada página:
 * - Esconde os links de administração (produtos, pedidos, usuarios) de quem não é admin;
 * - Esconde os links de cliente (carrinho, acompanhamento) de quem é admin ou não está logado;
 * - Troca "Entrar" por "Sair (nome)" quando há sessão;
 * - Destaca a página atual e sincroniza o contador do carrinho.
 */
function montarNavAuth() {
    const linksNav = document.querySelector('.links-nav');
    if (!linksNav) return;

    const linksAdmin = ['produtos.html', 'pedidos.html', 'usuarios.html'];

    linksNav.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href');
        // Se for link de admin e o usuário não for admin, remove
        if (linksAdmin.includes(href) && !ehAdministrador()) {
            link.remove();
        }
        // Se for link de carrinho e não for cliente logado, remove
        if (href === 'carrinho.html' && (!estaLogado() || ehAdministrador())) {
            link.remove();
        }
        // Se for link de acompanhamento e não estiver logado, remove
        if (href === 'acompanhamento.html' && !estaLogado()) {
            link.remove();
        }
        if (href === 'login.html' || href === 'perfil.html' || link.classList.contains('auth-dinamico')) {
            link.remove();
        }
    });

    const sessao = obterSessao();

    if (sessao) {
        // Se for CLIENTE (ou qualquer não-admin logado), garante link de Carrinho
        if (!ehAdministrador()) {
            const jaTemCarrinho = Array.from(linksNav.querySelectorAll('a')).some(a => a.getAttribute('href') === 'carrinho.html');
            if (!jaTemCarrinho) {
                const linkCarrinho = document.createElement('a');
                linkCarrinho.href = 'carrinho.html';
                linkCarrinho.className = 'auth-dinamico link-carrinho';
                linkCarrinho.innerHTML = `Carrinho <span class="badge bg-warning text-dark cart-count-badge" style="display:none; font-size:0.75rem; vertical-align:middle; border-radius:10px; margin-left:4px;">0</span>`;
                linksNav.appendChild(linkCarrinho);
            }
        }

        // Garante link de Acompanhamento para qualquer usuário logado (cliente ou admin)
        const jaTemAcompanhamento = Array.from(linksNav.querySelectorAll('a')).some(a => a.getAttribute('href') === 'acompanhamento.html');
        if (!jaTemAcompanhamento) {
            const linkAcompanhamento = document.createElement('a');
            linkAcompanhamento.href = 'acompanhamento.html';
            linkAcompanhamento.className = 'auth-dinamico';
            linkAcompanhamento.textContent = 'Acompanhamento';
            linksNav.appendChild(linkAcompanhamento);
        }

        const linkPerfil = document.createElement('a');
        linkPerfil.href = 'perfil.html';
        linkPerfil.className = 'auth-dinamico';
        linkPerfil.textContent = 'Minha conta';
        linksNav.appendChild(linkPerfil);

        const linkConta = document.createElement('a');
        linkConta.href = '#';
        linkConta.className = 'auth-dinamico';
        linkConta.textContent = `Sair (${sessao.usuario?.nome || 'Admin'})`;
        linkConta.onclick = (evento) => {
            evento.preventDefault();
            limparSessao();
            window.location.href = 'index.html';
        };
        linksNav.appendChild(linkConta);
    } else {
        const linkConta = document.createElement('a');
        linkConta.href = 'login.html';
        linkConta.className = 'auth-dinamico';
        linkConta.textContent = 'Entrar';
        linksNav.appendChild(linkConta);
    }

    // Destaque visual da página atual
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    linksNav.querySelectorAll('a').forEach((link) => {
        if (link.getAttribute('href') === paginaAtual) {
            link.classList.add('ativo');
        }
    });

    // Atualiza contagem visual do carrinho para clientes logados
    if (!ehAdministrador() && estaLogado()) {
        try {
            if (window.Carrinho && typeof window.Carrinho.atualizarBadgeNav === 'function') {
                window.Carrinho.atualizarBadgeNav();
            } else {
                const usuario = obterUsuarioLogado();
                const chave = usuario?.id ? `fc_carrinho_${usuario.id}` : 'fc_carrinho_cliente';
                const itens = JSON.parse(localStorage.getItem(chave)) || [];
                const total = itens.reduce((s, i) => s + (Number(i.quantidade) || 1), 0);
                const badge = linksNav.querySelector('.cart-count-badge');
                if (badge) {
                    badge.textContent = total;
                    badge.style.display = total > 0 ? 'inline-block' : 'none';
                }
            }
        } catch (e) {
            // silencioso
        }
    }
}

document.addEventListener('DOMContentLoaded', montarNavAuth);
