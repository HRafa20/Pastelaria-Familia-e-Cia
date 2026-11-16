/**
 * acompanhamento.js
 * Exibe os pedidos do cliente logado.
 * - CLIENTE: Acessa e visualiza EXCLUSIVAMENTE os seus próprios pedidos.
 * - ADMINISTRADOR: Visualiza TODOS os pedidos de todos os clientes do sistema e pode atualizar o status.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────
const ETAPAS = ['CRIADO', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];
const ETAPA_ICONES = {
    CRIADO:              'bi-receipt',
    EM_PREPARO:          'bi-fire',
    SAIU_PARA_ENTREGA:   'bi-bicycle',
    CONCLUIDO:           'bi-check-circle'
};
const ETAPA_LABELS = {
    CRIADO:              'Pedido criado',
    EM_PREPARO:          'Em preparo',
    SAIU_PARA_ENTREGA:   'Saiu para entrega',
    CONCLUIDO:           'Concluído'
};
const STATUS_BADGE = {
    CRIADO:              'bg-secondary',
    EM_PREPARO:          'bg-warning text-dark',
    SAIU_PARA_ENTREGA:   'bg-primary',
    CONCLUIDO:           'bg-success',
    CANCELADO:           'bg-danger',
    AGUARDANDO_PAGAMENTO:'bg-info text-dark'
};

// ─── Estado ───────────────────────────────────────────────────────────────────
let pedidosAtuais = [];
let intervaloAtualizacao = null;

// ─── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Exige usuário logado (cliente ou administrador)
    if (typeof exigirLogin === 'function') {
        exigirLogin();
    }

    await carregarPedidos();

    // Destaca pedido da URL (?id=xxx) se houver
    const idDestaque = new URLSearchParams(window.location.search).get('id');
    if (idDestaque) {
        setTimeout(() => destacarPedido(idDestaque), 350);
    }

    // Polling a cada 20s para atualizar o andamento
    intervaloAtualizacao = setInterval(carregarPedidos, 20_000);

    // Atualiza automaticamente caso um pedido seja criado ou alterado em outra aba
    window.addEventListener('storage', (e) => {
        if (e.key === 'fc_pedidos' || e.key === 'pedidos') {
            carregarPedidos();
        }
    });
});

window.addEventListener('beforeunload', () => {
    if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
});

// ─── Busca e filtragem de pedidos ─────────────────────────────────────────────
async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    try {
        const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
        const souAdmin = (typeof ehAdministrador === 'function') && ehAdministrador();

        const resposta = await window.api.getPedidos();
        let pedidos = resposta?.content || resposta || [];

        if (souAdmin) {
            // ADMINISTRADOR: Acesso a TODOS os pedidos realizados
            console.log(`[Acompanhamento] Modo Administrador: visualizando ${pedidos.length} pedido(s) totais.`);
        } else {
            // CLIENTE COMUM: Segurança estrita - visualiza APENAS os seus pedidos
            if (!usuario) {
                pedidos = [];
            } else {
                pedidos = pedidos.filter(p => {
                    const matchId = usuario.id && String(p.idUsuario) === String(usuario.id);
                    const matchEmail = usuario.email && p.emailCliente && (String(p.emailCliente).toLowerCase() === String(usuario.email).toLowerCase());
                    return matchId || matchEmail;
                });
            }
        }

        // Ordena do mais recente para o mais antigo
        pedidos.sort((a, b) => new Date(b.horarioCriacao) - new Date(a.horarioCriacao));

        pedidosAtuais = pedidos;
        renderizarPedidos(pedidos, souAdmin, usuario);

    } catch (erro) {
        console.error('[Acompanhamento] Erro ao carregar pedidos:', erro);
        lista.innerHTML = `
            <div class="alert alert-danger py-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Não foi possível carregar os pedidos. Verifique sua conexão.
            </div>`;
    }
}

// ─── Renderização ─────────────────────────────────────────────────────────────
function renderizarPedidos(pedidos, souAdmin, usuario) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    let bannerAdminHTML = '';
    if (souAdmin) {
        bannerAdminHTML = `
            <div class="alert alert-warning border-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 py-2 px-3 shadow-sm">
                <div>
                    <i class="bi bi-shield-lock-fill me-2 fs-5 text-dark"></i>
                    <strong>Visão de Administrador:</strong> Exibindo todos os <strong>${pedidos.length}</strong> pedidos realizados no sistema.
                </div>
                <a href="pedidos.html" class="btn btn-sm btn-dark">
                    <i class="bi bi-table me-1"></i>Tabela de Gestão de Pedidos
                </a>
            </div>`;
    }

    if (pedidos.length === 0) {
        if (souAdmin) {
            lista.innerHTML = `
                ${bannerAdminHTML}
                <div class="sem-pedidos text-center py-5">
                    <div class="icone-vazio mb-3"><i class="bi bi-inbox fs-1 text-muted"></i></div>
                    <h4>Nenhum pedido registrado no sistema</h4>
                    <p class="text-muted">Ainda não foram realizados pedidos por clientes.</p>
                </div>`;
        } else {
            lista.innerHTML = `
                <div class="sem-pedidos">
                    <div class="icone-vazio"><i class="bi bi-bag-x"></i></div>
                    <h4>Nenhum pedido encontrado</h4>
                    <p>Você ainda não realizou nenhum pedido.<br>Que tal escolher seu pastel favorito?</p>
                    <a href="cardapio.html" class="btn-acompanhamento">
                        <i class="bi bi-shop"></i> Ver cardápio
                    </a>
                </div>`;
        }
        return;
    }

    lista.innerHTML = bannerAdminHTML + pedidos.map(pedido => _htmlPedido(pedido, souAdmin)).join('');
}

function _htmlPedido(pedido, souAdmin) {
    const statusClass  = STATUS_BADGE[pedido.status] || 'bg-secondary';
    const statusLabel  = (pedido.status || 'CRIADO').replaceAll('_', ' ');
    const posicao      = ETAPAS.indexOf(pedido.status);
    const cancelado    = pedido.status === 'CANCELADO';
    const dataCriacao  = pedido.horarioCriacao
        ? new Date(pedido.horarioCriacao).toLocaleString('pt-BR')
        : '—';

    // Etapas da Linha do tempo
    const etapasHTML = cancelado
        ? `<div class="p-2 border border-danger rounded bg-danger-subtle text-danger">
               <i class="bi bi-x-circle me-1"></i><strong>Pedido cancelado.</strong>
               ${pedido.motivoCancelamento ? `<br><small>Motivo: ${_esc(pedido.motivoCancelamento)}</small>` : ''}
           </div>`
        : ETAPAS.map((etapa, i) => {
            const ativa = i <= posicao;
            return `
                <div class="etapa ${ativa ? 'concluida' : ''}">
                    <div class="icone"><i class="bi ${ETAPA_ICONES[etapa]}"></i></div>
                    <p>${ETAPA_LABELS[etapa]}</p>
                </div>`;
        }).join('');

    // Lista de produtos
    const itensHTML = (pedido.itens || []).map(item => `
        <div class="produto-item">
            <span>${_esc(item.quantidade || 1)}x ${_esc(item.nome || 'Pastel')}</span>
            <strong>R$ ${_fmt((item.precoUnitario || item.preco || 0) * (item.quantidade || 1))}</strong>
        </div>`).join('') || '<p class="text-muted small">Nenhum item informado.</p>';

    // Endereço
    const enderecoHTML = pedido.tipoEntrega === 'DELIVERY'
        ? `<p class="mb-0">${_esc(pedido.endereco || 'Não informado')}</p>`
        : `<p class="mb-0"><em>Retirada no local</em></p>`;

    // Painel exclusivo do Administrador no card
    let controleAdminHTML = '';
    if (souAdmin) {
        controleAdminHTML = `
            <div class="mt-3 pt-3 border-top bg-light p-2 rounded">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <span class="badge bg-dark me-1"><i class="bi bi-person-fill me-1"></i>Cliente</span>
                        <strong>${_esc(pedido.nomeCliente || 'Cliente')}</strong>
                        ${pedido.emailCliente ? `<span class="text-muted small ms-1">(${_esc(pedido.emailCliente)})</span>` : ''}
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <label class="form-label mb-0 small fw-bold text-secondary">Atualizar status:</label>
                        <select class="form-select form-select-sm" style="width: auto; min-width: 160px;" 
                            onchange="mudarStatusAdmin('${_esc(pedido.id)}', this.value)">
                            ${ETAPAS.map(etapa => `
                                <option value="${etapa}" ${pedido.status === etapa ? 'selected' : ''}>
                                    ${ETAPA_LABELS[etapa]}
                                </option>`).join('')}
                            <option value="CANCELADO" ${pedido.status === 'CANCELADO' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                </div>
            </div>`;
    }

    return `
        <div class="pedido-card mb-4" id="pedido-${_esc(pedido.id)}">
            <div class="pedido-topo">
                <div>
                    <h4>Pedido #${_esc(String(pedido.id || '').slice(-8))}</h4>
                    <p class="mb-0 text-muted small">${dataCriacao}</p>
                </div>
                <span class="badge ${statusClass} fs-6">${statusLabel}</span>
            </div>

            <h5 class="titulo-etapas">Andamento do pedido</h5>
            <div class="etapas">${etapasHTML}</div>

            <div class="produtos-pedido">
                <h5>Itens do pedido</h5>
                ${itensHTML}
            </div>

            <div class="informacoes-pedido">
                <div class="info-box">
                    <i class="bi bi-geo-alt"></i>
                    <strong>Entrega</strong>
                    ${enderecoHTML}
                </div>
                <div class="info-box">
                    <i class="bi bi-credit-card"></i>
                    <strong>Pagamento</strong>
                    <p class="mb-0">${_esc(pedido.formaPagamento || pedido.pagamento || 'Não informado')}</p>
                </div>
                ${pedido.telefone ? `
                <div class="info-box">
                    <i class="bi bi-telephone"></i>
                    <strong>Telefone</strong>
                    <p class="mb-0">${_esc(pedido.telefone)}</p>
                </div>` : ''}
            </div>

            <div class="total-pedido">
                Total: <strong>R$ ${_fmt(pedido.precoTotal || 0)}</strong>
            </div>

            ${controleAdminHTML}
        </div>`;
}

// ─── Ação exclusiva do Admin: Alterar status ───────────────────────────────────
window.mudarStatusAdmin = async function(idPedido, novoStatus) {
    try {
        await window.api.atualizarPedido(idPedido, { status: novoStatus });
        await carregarPedidos();
    } catch (erro) {
        console.error('[mudarStatusAdmin]', erro);
        alert(`Erro ao atualizar status do pedido: ${erro.message}`);
    }
};

// ─── Destaque de pedido específico ────────────────────────────────────────────
function destacarPedido(id) {
    const el = document.getElementById(`pedido-${id}`)
        || document.querySelector(`[id$="${id.slice(-8)}"]`);

    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '3px solid #d97706';
    el.style.borderRadius = '12px';
    setTimeout(() => { el.style.outline = ''; }, 3500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmt(valor) {
    const n = Number(valor);
    return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');
}
