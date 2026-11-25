
const ETAPAS = ['CRIADO', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];
const ETAPA_ICONES = {
    CRIADO: 'bi-receipt',
    EM_PREPARO: 'bi-fire',
    SAIU_PARA_ENTREGA: 'bi-bicycle',
    CONCLUIDO: 'bi-check-circle'
};
const ETAPA_LABELS = {
    CRIADO: 'Pedido criado',
    EM_PREPARO: 'Em preparo',
    SAIU_PARA_ENTREGA: 'Saiu para entrega',
    CONCLUIDO: 'Concluído'
};
const STATUS_BADGE = {
    CRIADO: 'bg-secondary',
    EM_PREPARO: 'bg-warning text-dark',
    SAIU_PARA_ENTREGA: 'bg-primary',
    CONCLUIDO: 'bg-success',
    CANCELADO: 'bg-danger',
    AGUARDANDO_PAGAMENTO: 'bg-info text-dark'
};

// Estado
let pedidosAtuais = [];
let intervaloAtualizacao = null;

// Quando a tela abre
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof exigirLogin === 'function') {
        exigirLogin();
    }

    await carregarPedidos();

    const idDestaque = new URLSearchParams(window.location.search).get('id');

    if (idDestaque) {
        setTimeout(() => destacarPedido(idDestaque), 350);
    }

    intervaloAtualizacao = setInterval(carregarPedidos, 20000);

    window.addEventListener('storage', (e) => {
        if (e.key === 'fc_pedidos' || e.key === 'pedidos') {
            carregarPedidos();
        }
    });
});

// Desliga atualização ao sair
window.addEventListener('beforeunload', () => {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }
});

// Busca os pedidos
async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    try {
        const usuario = typeof obterUsuarioLogado === 'function'
            ? obterUsuarioLogado()
            : null;

        const souAdmin = typeof ehAdministrador === 'function'
            && ehAdministrador();

        const resposta = await window.api.getPedidos();
        let pedidos = resposta?.content || resposta || [];

        // Filtra os pedidos do cliente logado
        if (souAdmin) {
            console.log(`[Acompanhamento] Administrador: ${pedidos.length} pedido(s).`);
        } else {
            if (!usuario) {
                pedidos = [];
            } else {
                pedidos = pedidos.filter(p => {
                    const matchId = usuario.id &&
                        String(p.idUsuario) === String(usuario.id);

                    const matchEmail = usuario.email &&
                        p.emailCliente &&
                        String(p.emailCliente).toLowerCase() ===
                        String(usuario.email).toLowerCase();

                    return matchId || matchEmail;
                });
            }
        }

        // Carrega catálogo de produtos para recuperar nomes e preços
        let mapaProdutos = new Map();

        try {
            if (typeof window.api.getProdutos === 'function') {
                const produtosResp = await window.api.getProdutos();
                const produtos = Array.isArray(produtosResp)
                    ? produtosResp
                    : (produtosResp?.content || []);

                produtos.forEach(produto => {
                    if (produto && produto.id != null) {
                        mapaProdutos.set(String(produto.id), produto);
                    }
                });
            }
        } catch (e) {
            console.warn('[Acompanhamento] Erro ao carregar produtos:', e);
        }

        // Recupera os detalhes dos itens de cada pedido
        pedidos = await Promise.all(pedidos.map(async pedido => {
            let itens = Array.isArray(pedido.itens)
                ? pedido.itens
                : [];

            // Busca pedido completo caso os itens estejam incompletos
            if (
                (!itens.length || itens.some(item => !item.nome && !item.descricao)) &&
                pedido.id &&
                typeof window.api.getPedido === 'function'
            ) {
                try {
                    const completo = await window.api.getPedido(pedido.id);

                    if (completo && Array.isArray(completo.itens) &&
                        completo.itens.length) {
                        itens = completo.itens;
                    }
                } catch (e) {
                    console.warn(
                        `[Acompanhamento] Erro ao buscar itens do pedido ${pedido.id}:`,
                        e
                    );
                }
            }

            // Completa os dados dos produtos usando o catálogo
            pedido.itens = itens.map(item => {
                const idProduto = item.idProduto ??
                    item.produtoId ??
                    item.id;

                const produto = idProduto != null
                    ? mapaProdutos.get(String(idProduto))
                    : null;

                const nome = item.nome ||
                    item.descricao ||
                    produto?.nome ||
                    produto?.descricao ||
                    'Produto';

                const preco = Number(
                    item.precoUnitario ??
                    item.preco ??
                    produto?.preco ??
                    produto?.valor ??
                    0
                );

                const quantidade = Number(
                    item.quantidade ?? item.qtd ?? 1
                ) || 1;

                return {
                    ...item,
                    idProduto,
                    nome,
                    precoUnitario: preco,
                    preco,
                    quantidade,
                    subtotal: Number(
                        item.subtotal ?? (preco * quantidade)
                    )
                };
            });

            return pedido;
        }));

        // Ordena pedidos do mais recente para o mais antigo
        pedidos.sort((a, b) =>
            new Date(b.horarioCriacao) - new Date(a.horarioCriacao)
        );

        // Busca usuários para recuperar nomes
        let mapaUsuarios = new Map();

        try {
            const usuariosResp = await window.api.getUsuarios();
            const listaU = Array.isArray(usuariosResp)
                ? usuariosResp
                : (usuariosResp?.content || []);

            listaU.forEach(u => {
                if (!u) return;

                if (u.id) mapaUsuarios.set(String(u.id), u);

                if (u.email) {
                    mapaUsuarios.set(String(u.email).toLowerCase(), u);
                }

                const telefone = String(u.telefone || '').replace(/\D/g, '');

                if (telefone) {
                    mapaUsuarios.set('tel_' + telefone, u);
                }
            });
        } catch (e) {}

        // Busca usuários salvos localmente
        try {
            const cad = JSON.parse(
                localStorage.getItem('fc_usuarios_cadastrados') || '[]'
            );

            cad.forEach(u => {
                if (!u) return;

                if (u.id && !mapaUsuarios.has(String(u.id))) {
                    mapaUsuarios.set(String(u.id), u);
                }

                if (u.email &&
                    !mapaUsuarios.has(String(u.email).toLowerCase())) {
                    mapaUsuarios.set(String(u.email).toLowerCase(), u);
                }

                const telefone = String(u.telefone || '').replace(/\D/g, '');

                if (telefone && !mapaUsuarios.has('tel_' + telefone)) {
                    mapaUsuarios.set('tel_' + telefone, u);
                }
            });
        } catch (e) {}

        // Identifica o cliente de cada pedido
        pedidos.forEach(p => {
            const idPed = String(
                p.usuarioId ||
                p.idUsuario ||
                p.usuario_id ||
                p.usuario?.id ||
                ''
            );

            const emailPed = String(
                p.emailCliente ||
                p.email ||
                p.usuario?.email ||
                ''
            ).toLowerCase();

            const telLimpo = String(
                p.telefone ||
                p.usuario?.telefone ||
                ''
            ).replace(/\D/g, '');

            const u = (idPed && mapaUsuarios.get(idPed)) ||
                (emailPed && mapaUsuarios.get(emailPed)) ||
                (telLimpo && mapaUsuarios.get('tel_' + telLimpo));

            if (u && u.nome) {
                p.nomeCliente = u.nome;

                if (!p.emailCliente && u.email) {
                    p.emailCliente = u.email;
                }

                if ((!p.telefone || p.telefone === '0') && u.telefone) {
                    p.telefone = u.telefone;
                }
            } else if (
                !p.nomeCliente ||
                p.nomeCliente.trim().toLowerCase() === 'cliente'
            ) {
                if (usuario && (
                    (usuario.id && idPed &&
                        String(usuario.id) === idPed) ||
                    (usuario.email && emailPed &&
                        String(usuario.email).toLowerCase() === emailPed) ||
                    !souAdmin
                )) {
                    p.nomeCliente = usuario.nome ||
                        p.nomeCliente ||
                        'Cliente';
                }
            }
        });

        pedidosAtuais = pedidos;
        renderizarPedidos(pedidos, souAdmin, usuario);

    } catch (erro) {
        console.error('[Acompanhamento] Erro ao carregar pedidos:', erro);

        lista.innerHTML = `
            <div class="alert alert-danger py-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Não foi possível carregar os pedidos.
                Verifique sua conexão.
            </div>`;
    }
}

// Renderiza os pedidos
function renderizarPedidos(pedidos, souAdmin, usuario) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    let bannerAdminHTML = '';

    if (souAdmin) {
        bannerAdminHTML = `
            <div class="alert alert-warning border-warning d-flex flex-wrap
                justify-content-between align-items-center gap-2 mb-4
                py-2 px-3 shadow-sm">
                <div>
                    <i class="bi bi-shield-lock-fill me-2 fs-5 text-dark"></i>
                    <strong>Visão de Administrador:</strong>
                    Exibindo todos os
                    <strong>${pedidos.length}</strong> pedidos realizados.
                </div>

                <a href="pedidos.html" class="btn btn-sm btn-dark">
                    <i class="bi bi-table me-1"></i>
                    Tabela de Gestão de Pedidos
                </a>
            </div>`;
    }

    // Nenhum pedido
    if (pedidos.length === 0) {
        if (souAdmin) {
            lista.innerHTML = `
                ${bannerAdminHTML}
                <div class="sem-pedidos text-center py-5">
                    <div class="icone-vazio mb-3">
                        <i class="bi bi-inbox fs-1 text-muted"></i>
                    </div>
                    <h4>Nenhum pedido registrado no sistema</h4>
                    <p class="text-muted">
                        Ainda não foram realizados pedidos por clientes.
                    </p>
                </div>`;
        } else {
            lista.innerHTML = `
                <div class="sem-pedidos">
                    <div class="icone-vazio">
                        <i class="bi bi-bag-x"></i>
                    </div>
                    <h4>Nenhum pedido encontrado</h4>
                    <p>
                        Você ainda não realizou nenhum pedido.<br>
                        Que tal escolher seu pastel favorito?
                    </p>
                    <a href="cardapio.html" class="btn-acompanhamento">
                        <i class="bi bi-shop"></i> Ver cardápio
                    </a>
                </div>`;
        }

        return;
    }

    lista.innerHTML = bannerAdminHTML +
        pedidos.map(pedido => _htmlPedido(pedido, souAdmin)).join('');
}

// HTML de cada pedido
function _htmlPedido(pedido, souAdmin) {
    const statusClass = STATUS_BADGE[pedido.status] || 'bg-secondary';
    const statusLabel = (pedido.status || 'CRIADO').replaceAll('_', ' ');
    const posicao = ETAPAS.indexOf(pedido.status);
    const cancelado = pedido.status === 'CANCELADO';

    const dataCriacao = pedido.horarioCriacao
        ? new Date(pedido.horarioCriacao).toLocaleString('pt-BR')
        : '—';

    // Linha do tempo
    const etapasHTML = cancelado
        ? `
            <div class="p-2 border border-danger rounded
                bg-danger-subtle text-danger">
                <i class="bi bi-x-circle me-1"></i>
                <strong>Pedido cancelado.</strong>
                ${pedido.motivoCancelamento
                    ? `<br><small>Motivo:
                        ${_esc(pedido.motivoCancelamento)}</small>`
                    : ''}
            </div>`
        : ETAPAS.map((etapa, i) => {
            const ativa = i <= posicao;

            return `
                <div class="etapa ${ativa ? 'concluida' : ''}">
                    <div class="icone">
                        <i class="bi ${ETAPA_ICONES[etapa]}"></i>
                    </div>
                    <p>${ETAPA_LABELS[etapa]}</p>
                </div>`;
        }).join('');

    // Produtos do pedido
    const itensHTML = (pedido.itens || []).map(item => `
        <div class="produto-item">
            <span>
                ${_esc(item.quantidade || 1)}x
                ${_esc(item.nome || 'Pastel')}
            </span>

            <strong>
                R$ ${_fmt(
                    item.subtotal ??
                    ((item.precoUnitario || item.preco || 0) *
                    (item.quantidade || 1))
                )}
            </strong>
        </div>
    `).join('') ||
    '<p class="text-muted small">Nenhum item informado.</p>';

    // Endereço
    const enderecoHTML = pedido.tipoEntrega === 'DELIVERY'
        ? `<p class="mb-0">${_esc(pedido.endereco || 'Não informado')}</p>`
        : `<p class="mb-0"><em>Retirada no local</em></p>`;

    // Controles do administrador
    let controleAdminHTML = '';

    if (souAdmin) {
        controleAdminHTML = `
            <div class="mt-3 pt-3 border-top bg-light p-2 rounded">
                <div class="d-flex flex-wrap
                    justify-content-between align-items-center gap-2">

                    <div>
                        <span class="badge bg-dark me-1">
                            <i class="bi bi-person-fill me-1"></i>
                            Cliente:
                        </span>

                        <strong class="text-dark">
                            ${_esc(pedido.nomeCliente || 'Cliente')}
                        </strong>

                        ${pedido.emailCliente
                            ? `<span class="text-muted small ms-1">
                                (${_esc(pedido.emailCliente)})
                            </span>`
                            : ''}
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <label class="form-label mb-0 small fw-bold
                            text-secondary">
                            Atualizar status:
                        </label>

                        <select class="form-select form-select-sm"
                            style="width: auto; min-width: 160px;"
                            onchange="mudarStatusAdmin(
                                '${_esc(pedido.id)}', this.value
                            )">

                            ${ETAPAS.map(etapa => `
                                <option value="${etapa}"
                                    ${pedido.status === etapa ? 'selected' : ''}>
                                    ${ETAPA_LABELS[etapa]}
                                </option>
                            `).join('')}

                            <option value="CANCELADO"
                                ${pedido.status === 'CANCELADO' ? 'selected' : ''}>
                                Cancelado
                            </option>
                        </select>
                    </div>
                </div>
            </div>`;
    }

    return `
        <div class="pedido-card mb-4" id="pedido-${_esc(pedido.id)}">

            <div class="pedido-topo">
                <div>
                    <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h4 class="mb-0">
                            Pedido #${_esc(String(pedido.id || '').slice(-8))}
                        </h4>

                        <span class="badge bg-light text-dark border px-2 py-1">
                            <i class="bi bi-person-fill me-1 text-primary"></i>
                            ${_esc(pedido.nomeCliente || 'Cliente')}
                        </span>
                    </div>

                    <p class="mb-0 text-muted small">${dataCriacao}</p>
                </div>

                <span class="badge ${statusClass} fs-6">
                    ${statusLabel}
                </span>
            </div>

            <h5 class="titulo-etapas">Andamento do pedido</h5>

            <div class="etapas">
                ${etapasHTML}
            </div>

            <div class="produtos-pedido">
                <h5>Itens do pedido</h5>
                ${itensHTML}
            </div>

            <div class="informacoes-pedido">
                <div class="info-box">
                    <i class="bi bi-person"></i>
                    <strong>Cliente</strong>
                    <p class="mb-0 fw-semibold">
                        ${_esc(pedido.nomeCliente || 'Cliente')}
                    </p>

                    ${pedido.emailCliente
                        ? `<small class="text-muted d-block">
                            ${_esc(pedido.emailCliente)}
                        </small>`
                        : ''}
                </div>

                <div class="info-box">
                    <i class="bi bi-geo-alt"></i>
                    <strong>Entrega</strong>
                    ${enderecoHTML}
                </div>

                <div class="info-box">
                    <i class="bi bi-credit-card"></i>
                    <strong>Pagamento</strong>
                    <p class="mb-0">
                        ${_esc(
                            pedido.formaPagamento ||
                            pedido.pagamento ||
                            'Não informado'
                        )}
                    </p>
                </div>

                ${(pedido.telefone && pedido.telefone !== '0')
                    ? `
                        <div class="info-box">
                            <i class="bi bi-telephone"></i>
                            <strong>Telefone</strong>
                            <p class="mb-0">${_esc(pedido.telefone)}</p>
                        </div>
                    `
                    : ''}
            </div>

            <div class="total-pedido">
                Total:
                <strong>R$ ${_fmt(pedido.precoTotal || 0)}</strong>
            </div>

            ${controleAdminHTML}
        </div>`;
}

// Alterar status (Administrador)
window.mudarStatusAdmin = async function(idPedido, novoStatus) {
    try {
        await window.api.atualizarPedido(idPedido, {
            status: novoStatus
        });

        await carregarPedidos();
    } catch (erro) {
        console.error('[mudarStatusAdmin]', erro);
        alert(`Erro ao atualizar status do pedido: ${erro.message}`);
    }
};

// Destacar pedido
function destacarPedido(id) {
    const el = document.getElementById(`pedido-${id}`)
        || document.querySelector(`[id$="${id.slice(-8)}"]`);

    if (!el) return;

    el.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    el.style.outline = '3px solid #d97706';
    el.style.borderRadius = '12px';

    setTimeout(() => {
        el.style.outline = '';
    }, 3500);
}

// Helpers
function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _fmt(valor) {
    const n = Number(valor);

    return isNaN(n)
        ? '0,00'
        : n.toFixed(2).replace('.', ',');
}
