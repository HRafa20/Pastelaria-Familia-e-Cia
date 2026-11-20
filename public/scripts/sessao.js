/**
 * sessao.js - O "Segurança da Porta" e Controle de Acesso
 
 */

const CHAVE_SESSAO = 'pastelaria_sessao'; // Nome da gaveta onde o crachá fica guardado

// Guarda os dados de quem acabou de fazer login (fica salvo mesmo se fechar a aba)
function salvarSessao(sessao) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

// Olha na memória para ver quem é a pessoa que está usando o site agora
function obterSessao() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
        return null; // Ninguém logado
    }
}

// Botão de "Sair" (Logout): rasga o crachá e desloga a pessoa
function limparSessao() {
    localStorage.removeItem(CHAVE_SESSAO);
}

// Pergunta rápida: tem alguém logado agora? (Devolve sim ou não)
function estaLogado() {
    return !!obterSessao()?.token;
}

// Pega o nome, e-mail e telefone do usuário logado
function obterUsuarioLogado() {
    return obterSessao()?.usuario ?? null;
}

// Pergunta rápida: quem está logado é o Dono/Administrador?
function ehAdministrador() {
    return obterUsuarioLogado()?.tipo === 'ADMINISTRADOR';
}

// Pergunta rápida: quem está logado é um Cliente?
function ehCliente() {
    return estaLogado() && obterUsuarioLogado()?.tipo === 'CLIENTE';
}

// ─── Guardas de Porta (Proteção de Páginas) ─────────────────────────────────

// Tranca a porta: só passa se estiver logado (senão manda para a tela de login)
function exigirLogin() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
    }
}

// Tranca a porta com cadeado de Dono: se for cliente comum tentando bisbilhotar, avisa e expulsa
function exigirAdministrador() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
        return;
    }
    if (!ehAdministrador()) {
        alert('Essa área é restrita a administradores.');
        window.location.href = 'index.html'; // Manda de volta para o cardápio
    }
}

// Área de clientes: o Dono não precisa comprar pastel de si mesmo, então é só para clientes
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
 * Arruma o menu do topo (Navbar) dependendo de quem está olhando:
 * - Se for cliente: esconde os botões de mexer no cardápio e ver usuários;
 * - Se for o dono: esconde o carrinho e mostra os botões de administração;
 * - Se não estiver logado: mostra botão "Entrar"; se estiver logado, mostra "Sair (Seu Nome)".
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
                linkCarrinho.innerHTML = `<i class="bi bi-cart3"></i><span class="cart-text">Carrinho</span> <span class="badge bg-warning text-dark cart-count-badge" style="display:none; font-size:0.75rem; vertical-align:middle; border-radius:10px; margin-left:4px;">0</span>`;
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
    // Inicializa suporte a menu responsivo (mobile / tablet) se existir na página
    configurarMenuMobile();
}

function configurarMenuMobile() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    let toggle = nav.querySelector('.nav-toggle') || document.getElementById('navToggle');
    const linksNav = nav.querySelector('.links-nav') || document.getElementById('linksNav');
    if (!linksNav) return;

    // Se a página ainda não tiver o botão hamburguer no HTML, cria automaticamente
    if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'nav-toggle';
        toggle.id = 'navToggle';
        toggle.setAttribute('aria-label', 'Abrir menu de navegação');
        toggle.innerHTML = '<i class="bi bi-list"></i>';

        const primeiroLink = nav.querySelector('a');
        if (primeiroLink) {
            primeiroLink.classList.add('nav-brand');
            primeiroLink.insertAdjacentElement('afterend', toggle);
        } else {
            nav.insertBefore(toggle, linksNav);
        }
    }

    // Evita duplicar listeners
    if (toggle.dataset.menuConfigurado) return;
    toggle.dataset.menuConfigurado = 'true';

    toggle.addEventListener('click', () => {
        linksNav.classList.toggle('nav-open');
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = linksNav.classList.contains('nav-open') ? 'bi bi-x' : 'bi bi-list';
        }
    });

    // Fecha o menu ao clicar fora ou em algum link
    document.addEventListener('click', (evento) => {
        if (!nav.contains(evento.target)) {
            linksNav.classList.remove('nav-open');
            const icon = toggle.querySelector('i');
            if (icon) icon.className = 'bi bi-list';
        }
    });

    linksNav.addEventListener('click', (evento) => {
        if (evento.target.closest('a')) {
            linksNav.classList.remove('nav-open');
            const icon = toggle.querySelector('i');
            if (icon) icon.className = 'bi bi-list';
        }
    });
}

document.addEventListener('DOMContentLoaded', montarNavAuth);
