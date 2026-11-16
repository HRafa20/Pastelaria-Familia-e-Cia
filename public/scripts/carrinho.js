// ─── Objeto global Carrinho ───────────────────────────────────────────────────
window.Carrinho = {
    _chave: 'carrinho',

    adicionarItem(item) {
        let itens = this.obterItens();
        const index = itens.findIndex(i => i.id === item.id);
        if (index > -1) {
            itens[index].quantidade += item.quantidade;
        } else {
            itens.push(item);
        }
        localStorage.setItem(this._chave, JSON.stringify(itens));
        this.atualizarBadgeNav();
    },

    obterItens() {
        try {
            return JSON.parse(localStorage.getItem(this._chave)) || [];
        } catch {
            return [];
        }
    },

    obterQuantidadeTotal() {
        return this.obterItens().reduce((t, i) => t + (Number(i.quantidade) || 0), 0);
    },

    obterTotal() {
        return this.obterItens().reduce((t, i) => t + (Number(i.preco) * Number(i.quantidade)), 0);
    },

    removerItem(id) {
        const itens = this.obterItens().filter(i => i.id !== id);
        localStorage.setItem(this._chave, JSON.stringify(itens));
        this.atualizarBadgeNav();
    },

    alterarQuantidade(id, quantidade) {
        const itens = this.obterItens();
        const item = itens.find(i => i.id === id);
        if (!item) return;
        item.quantidade = parseInt(quantidade) || 1;
        if (item.quantidade <= 0) { this.removerItem(id); return; }
        localStorage.setItem(this._chave, JSON.stringify(itens));
        this.atualizarBadgeNav();
    },

    limpar() {
        localStorage.removeItem(this._chave);
        this.atualizarBadgeNav();
    },

    atualizarBadgeNav() {
        document.querySelectorAll('.cart-count-badge, #carrinho-quantidade-badge').forEach(el => {
            const qtd = this.obterQuantidadeTotal();
            el.textContent = qtd;
            if (el.style !== undefined) el.style.display = qtd > 0 ? '' : 'none';
        });
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatarPrecoCarrinho(valor) {
    const n = Number(valor);
    return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');
}

// ─── Renderização da lista do carrinho ────────────────────────────────────────
function renderizarCarrinho() {
    const lista = document.getElementById('carrinho-lista');
    if (!lista) return;

    // Sanitiza itens corrompidos (sem preco ou sem nome)
    let itens = Carrinho.obterItens();
    const itensSaos = itens.filter(i => i.nome && i.preco != null && !isNaN(Number(i.preco)));
    if (itensSaos.length !== itens.length) {
        localStorage.setItem(Carrinho._chave, JSON.stringify(itensSaos));
        itens = itensSaos;
    }

    if (itens.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-cart-x fs-1"></i>
                <p class="mt-3">Seu carrinho está vazio.</p>
                <a href="cardapio.html" class="btn btn-pastel mt-2">Ver cardápio</a>
            </div>`;
        _setResumo(0, 0);
        return;
    }

    lista.innerHTML = itens.map(item => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-3 gap-3">
            <div class="flex-grow-1">
                <strong>${_escHtml(item.nome)}</strong>
                <div class="text-muted small">R$ ${formatarPrecoCarrinho(item.preco)} cada</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <input type="number" min="1" value="${Number(item.quantidade)}"
                    class="form-control form-control-sm" style="width:70px"
                    onchange="Carrinho.alterarQuantidade('${_escHtml(item.id)}', this.value); renderizarCarrinho();">
                <span class="fw-bold" style="min-width:70px; text-align:right">
                    R$ ${formatarPrecoCarrinho(item.preco * item.quantidade)}
                </span>
                <button class="btn btn-sm btn-outline-danger"
                    onclick="Carrinho.removerItem('${_escHtml(item.id)}'); renderizarCarrinho();"
                    title="Remover">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    _setResumo(Carrinho.obterQuantidadeTotal(), Carrinho.obterTotal());
}

function _setResumo(qtd, total) {
    const elQtd      = document.getElementById('carrinho-quantidade');
    const elSubtotal = document.getElementById('carrinho-subtotal');
    const elTotal    = document.getElementById('carrinho-total');
    if (elQtd)      elQtd.textContent      = qtd;
    if (elSubtotal) elSubtotal.textContent = `R$ ${formatarPrecoCarrinho(total)}`;
    if (elTotal)    elTotal.textContent    = `R$ ${formatarPrecoCarrinho(total)}`;
}

function _escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Modal de finalização ─────────────────────────────────────────────────────
function abrirModalFinalizar() {
    const itens = Carrinho.obterItens();
    if (itens.length === 0) {
        alert('Adicione produtos ao carrinho antes de finalizar.');
        return;
    }

    if (typeof estaLogado === 'function' && !estaLogado()) {
        alert('Você precisa entrar na sua conta para finalizar o pedido.');
        window.location.href = 'login.html';
        return;
    }

    if (typeof ehAdministrador === 'function' && ehAdministrador()) {
        alert('Contas de administrador não realizam pedidos. Entre com uma conta de cliente.');
        return;
    }

    // Preenche resumo rápido no modal
    const elQtd   = document.getElementById('modal-qtd-itens');
    const elTotal = document.getElementById('modal-total');
    if (elQtd)   elQtd.textContent   = Carrinho.obterQuantidadeTotal() + ' item(s)';
    if (elTotal) elTotal.textContent = `R$ ${formatarPrecoCarrinho(Carrinho.obterTotal())}`;

    // Pré-preenche dados da sessão, se disponíveis
    const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
    const telInput = document.getElementById('finalizar-telefone');
    if (telInput && usuario?.telefone) telInput.value = usuario.telefone;

    // Reset
    const form = document.getElementById('formFinalizarPedido');
    if (form) { form.classList.remove('was-validated'); }
    document.getElementById('modal-alert-container').innerHTML = '';

    new bootstrap.Modal(document.getElementById('modalFinalizarPedido')).show();
}

// ─── Lógica do tipo de entrega ────────────────────────────────────────────────
function _configurarEntrega() {
    const select    = document.getElementById('finalizar-tipo-entrega');
    const container = document.getElementById('finalizar-endereco-container');
    const input     = document.getElementById('finalizar-endereco');
    if (!select) return;

    select.addEventListener('change', () => {
        const delivery = select.value === 'DELIVERY';
        container.hidden  = !delivery;
        input.required    = delivery;
    });
}

// ─── Envio do pedido ──────────────────────────────────────────────────────────
async function finalizarPedido() {
    const form = document.getElementById('formFinalizarPedido');
    if (!form) return;

    // Validação HTML5
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const tipoEntrega = document.getElementById('finalizar-tipo-entrega').value;
    const endereco    = document.getElementById('finalizar-endereco').value.trim();
    const telefone    = document.getElementById('finalizar-telefone').value.trim();
    const pagamento   = document.getElementById('finalizar-pagamento').value;

    if (tipoEntrega === 'DELIVERY' && !endereco) {
        document.getElementById('finalizar-endereco').setCustomValidity('Informe o endereço.');
        form.reportValidity();
        return;
    }
    document.getElementById('finalizar-endereco').setCustomValidity('');

    const itens = Carrinho.obterItens();
    if (itens.length === 0) {
        _mostrarAlertaModal('Seu carrinho está vazio.', 'warning');
        return;
    }

    // Monta payload estritamente compatível com o backend Spring Boot
    const payload = {
        tipoEntrega,
        endereco:       tipoEntrega === 'DELIVERY' ? endereco : null,
        formaPagamento: pagamento,
        telefone,
        itens: itens.map(i => ({
            idProduto:  i.id,
            quantidade: parseInt(i.quantidade, 10)
        }))
    };

    // UI: estado de carregamento
    _setBotaoCarregando(true);

    try {
        const pedidoCriado = await window.api.criarPedido(payload);

        // Limpa o carrinho local
        Carrinho.limpar();
        renderizarCarrinho();

        // Fecha o modal
        bootstrap.Modal.getInstance(document.getElementById('modalFinalizarPedido')).hide();

        // Redireciona para acompanhamento após breve delay
        const idRetornado = pedidoCriado?.id || pedidoCriado?.numero || '';
        setTimeout(() => {
            window.location.href = idRetornado ? `acompanhamento.html?id=${idRetornado}` : 'acompanhamento.html';
        }, 800);

    } catch (erro) {
        console.error('[finalizarPedido]', erro);
        _mostrarAlertaModal(`Erro ao criar pedido: ${erro.message}`, 'danger');
    } finally {
        _setBotaoCarregando(false);
    }
}

function _setBotaoCarregando(ativo) {
    const btn     = document.getElementById('btn-confirmar-pedido');
    const texto   = document.getElementById('btn-confirmar-texto');
    const loading = document.getElementById('btn-confirmar-loading');
    if (!btn) return;
    btn.disabled       = ativo;
    texto.hidden       = ativo;
    loading.hidden     = !ativo;
}

function _mostrarAlertaModal(msg, tipo = 'danger') {
    const container = document.getElementById('modal-alert-container');
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show py-2" role="alert">
            ${_escHtml(msg)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Configura o botão "Finalizar pedido" para abrir o modal
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', abrirModalFinalizar);
    }

    // Configura o botão "Confirmar pedido" dentro do modal
    const btnConfirmar = document.getElementById('btn-confirmar-pedido');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', finalizarPedido);
    }

    // Configura toggle do campo de endereço
    _configurarEntrega();

    // Renderiza o carrinho se estiver na página do carrinho
    if (document.getElementById('carrinho-lista')) {
        renderizarCarrinho();
    }
});
