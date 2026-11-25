/**
 * carrinho.js - Gerenciamento da Sacola de Compras e Envio do Pedido
 */

// ─── Objeto Carrinho ───────────────────────────────────────────────────────
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

        if (item.quantidade <= 0) {
            this.removerItem(id);
            return;
        }

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

// ─── Formatação de preço ──────────────────────────────────────────────────
function formatarPrecoCarrinho(valor) {
    const n = Number(valor);
    return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');
}

// ─── Desenha o carrinho na tela ──────────────────────────────────────────
function renderizarCarrinho() {
    const lista = document.getElementById('carrinho-lista');
    if (!lista) return;

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

// ─── Atualiza o resumo ───────────────────────────────────────────────────
function _setResumo(qtd, total) {
    const elQtd = document.getElementById('carrinho-quantidade');
    const elSubtotal = document.getElementById('carrinho-subtotal');
    const elTotal = document.getElementById('carrinho-total');

    if (elQtd) elQtd.textContent = qtd;
    if (elSubtotal) elSubtotal.textContent = `R$ ${formatarPrecoCarrinho(total)}`;
    if (elTotal) elTotal.textContent = `R$ ${formatarPrecoCarrinho(total)}`;
}

// ─── Segurança básica de texto ────────────────────────────────────────────
function _escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Abre o modal de finalização ─────────────────────────────────────────
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

    const elQtd = document.getElementById('modal-qtd-itens');
    const elTotal = document.getElementById('modal-total');

    if (elQtd) elQtd.textContent = Carrinho.obterQuantidadeTotal() + ' item(s)';
    if (elTotal) elTotal.textContent = `R$ ${formatarPrecoCarrinho(Carrinho.obterTotal())}`;

    const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
    const telInput = document.getElementById('finalizar-telefone');

    if (telInput && usuario?.telefone) telInput.value = usuario.telefone;

    const form = document.getElementById('formFinalizarPedido');
    if (form) form.classList.remove('was-validated');

    document.getElementById('modal-alert-container').innerHTML = '';

    new bootstrap.Modal(document.getElementById('modalFinalizarPedido')).show();
}

// ─── Configura entrega ou retirada ────────────────────────────────────────
function _configurarEntrega() {
    const select = document.getElementById('finalizar-tipo-entrega');
    const container = document.getElementById('finalizar-endereco-container');
    const input = document.getElementById('finalizar-endereco');

    if (!select) return;

    select.addEventListener('change', () => {
        const delivery = select.value === 'DELIVERY';
        container.hidden = !delivery;
        input.required = delivery;
    });
}

// ─── Finaliza o pedido ───────────────────────────────────────────────────
async function finalizarPedido() {
    const form = document.getElementById('formFinalizarPedido');
    if (!form) return;

    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const tipoEntrega = document.getElementById('finalizar-tipo-entrega').value;
    const endereco = document.getElementById('finalizar-endereco').value.trim();
    const telefone = document.getElementById('finalizar-telefone').value.trim();
    const pagamento = document.getElementById('finalizar-pagamento').value;

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

    const usuarioLogado = (typeof obterUsuarioLogado === 'function')
        ? obterUsuarioLogado()
        : null;

    try {
        _setBotaoCarregando(true);

        // Busca os produtos reais cadastrados no servidor
        let produtosServidor = await window.api.getProdutos();

        produtosServidor = Array.isArray(produtosServidor)
            ? produtosServidor
            : (produtosServidor?.content || []);

        // Normaliza nomes para comparar
        const normalizarNome = (nome) => String(nome || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();

        // Localiza os IDs reais dos produtos
        const itensComIdsReais = itens.map(item => {
            let produtoServidor = produtosServidor.find(p =>
                String(p.id) === String(item.id)
            );

            if (!produtoServidor) {
                produtoServidor = produtosServidor.find(p =>
                    normalizarNome(p.nome) === normalizarNome(item.nome)
                );
            }

            if (!produtoServidor || produtoServidor.id == null) {
                throw new Error(
                    `Não foi possível encontrar "${item.nome}" no catálogo do servidor. Atualize o cardápio e adicione o produto novamente.`
                );
            }

            return {
                idProduto: String(produtoServidor.id),
                nome: produtoServidor.nome || item.nome,
                preco: Number(produtoServidor.preco ?? item.preco),
                precoUnitario: Number(produtoServidor.preco ?? item.preco),
                quantidade: parseInt(item.quantidade, 10) || 1
            };
        });

        // Monta os dados do pedido
        const payload = {
            usuarioId: usuarioLogado?.id || null,
            nomeCliente: usuarioLogado?.nome || '',
            emailCliente: usuarioLogado?.email || '',
            tipoEntrega,
            endereco: tipoEntrega === 'DELIVERY'
                ? endereco
                : (endereco || 'Retirada no balcão'),
            formaPagamento: pagamento,
            telefone: telefone || usuarioLogado?.telefone || '',
            itens: itensComIdsReais,
            precoTotal: itensComIdsReais.reduce(
                (total, i) => total + (i.precoUnitario * i.quantidade), 0
            )
        };

        // Envia o pedido
        const pedidoCriado = await window.api.criarPedido(payload);

        // Limpa o carrinho após o pedido ser criado
        Carrinho.limpar();
        renderizarCarrinho();

        // Fecha o modal
        bootstrap.Modal.getInstance(
            document.getElementById('modalFinalizarPedido')
        ).hide();

        // Abre o acompanhamento
        const idRetornado = pedidoCriado?.id || pedidoCriado?.numero || '';

        setTimeout(() => {
            window.location.href = idRetornado
                ? `acompanhamento.html?id=${idRetornado}`
                : 'acompanhamento.html';
        }, 800);

    } catch (erro) {
        console.error('[finalizarPedido]', erro);
        _mostrarAlertaModal(`Erro ao criar pedido: ${erro.message}`, 'danger');
    } finally {
        _setBotaoCarregando(false);
    }
}

// ─── Botão de carregamento ────────────────────────────────────────────────
function _setBotaoCarregando(ativo) {
    const btn = document.getElementById('btn-confirmar-pedido');
    const texto = document.getElementById('btn-confirmar-texto');
    const loading = document.getElementById('btn-confirmar-loading');

    if (!btn) return;

    btn.disabled = ativo;
    if (texto) texto.hidden = ativo;
    if (loading) loading.hidden = !ativo;
}

// ─── Mostra alerta no modal ───────────────────────────────────────────────
function _mostrarAlertaModal(msg, tipo = 'danger') {
    const container = document.getElementById('modal-alert-container');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show py-2" role="alert">
            ${_escHtml(msg)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
}

// ─── Inicialização ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const btnFinalizar = document.getElementById('btn-finalizar');

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', abrirModalFinalizar);
    }

    const btnConfirmar = document.getElementById('btn-confirmar-pedido');

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', finalizarPedido);
    }

    _configurarEntrega();

    if (document.getElementById('carrinho-lista')) {
        renderizarCarrinho();
    }
});