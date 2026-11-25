/**
 * carrinho.js - Gerenciamento da Sacola de Compras e Envio do Pedido
 */

// ─── Objeto Carrinho: Cuida de guardar, somar e alterar os pastéis ──────────
window.Carrinho = {
    _chave: 'carrinho', // Nome da "gaveta" na memória do navegador onde os itens ficam salvos

    // Coloca um pastel no carrinho (ou aumenta o número se já estava lá):
    adicionarItem(item) {
        let itens = this.obterItens(); // Pega o que já tem na sacola
        const index = itens.findIndex(i => i.id === item.id);
        if (index > -1) {
            itens[index].quantidade += item.quantidade; // Se já tinha pastel de carne, só aumenta a quantidade
        } else {
            itens.push(item); // Se for um sabor novo, adiciona na lista
        }
        localStorage.setItem(this._chave, JSON.stringify(itens)); // Salva na memória do celular
        this.atualizarBadgeNav(); // Atualiza a contagem no topo da tela
    },

    // Lê a lista de pastéis que estão salvos na memória do celular
    obterItens() {
        try {
            return JSON.parse(localStorage.getItem(this._chave)) || [];
        } catch {
            return [];
        }
    },

    // Soma quantos pastéis tem no total (ex: 2 de queijo + 1 de carne = 3)
    obterQuantidadeTotal() {
        return this.obterItens().reduce((t, i) => t + (Number(i.quantidade) || 0), 0);
    },

    // Multiplica quantidade x preço de cada um e devolve o valor total em R$
    obterTotal() {
        return this.obterItens().reduce((t, i) => t + (Number(i.preco) * Number(i.quantidade)), 0);
    },

    // Tira um pastel da sacola quando o cliente clica no botão da lixeira
    removerItem(id) {
        const itens = this.obterItens().filter(i => i.id !== id);
        localStorage.setItem(this._chave, JSON.stringify(itens)); // Salva a lista sem o item removido
        this.atualizarBadgeNav(); // Atualiza o contador visual
    },

    // Se o cliente digitar outra quantidade no campinho numérico (ex: mudar de 1 para 5)
    alterarQuantidade(id, quantidade) {
        const itens = this.obterItens();
        const item = itens.find(i => i.id === id);
        if (!item) return;
        item.quantidade = parseInt(quantidade) || 1;
        if (item.quantidade <= 0) { this.removerItem(id); return; } // Se colocou 0, remove o pastel
        localStorage.setItem(this._chave, JSON.stringify(itens));
        this.atualizarBadgeNav();
    },

    // Esvazia a sacola (usado logo após o cliente enviar o pedido)
    limpar() {
        localStorage.removeItem(this._chave);
        this.atualizarBadgeNav();
    },

    // Atualiza a bolinha amarela com o número no ícone do carrinho no menu
    atualizarBadgeNav() {
        document.querySelectorAll('.cart-count-badge, #carrinho-quantidade-badge').forEach(el => {
            const qtd = this.obterQuantidadeTotal();
            el.textContent = qtd;
            if (el.style !== undefined) el.style.display = qtd > 0 ? '' : 'none'; // Some se estiver vazio
        });
    }
};

// Transforma número em formato de dinheiro (ex: 12 vira "12,00")
function formatarPrecoCarrinho(valor) {
    const n = Number(valor);
    return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');
}

// ─── Desenha a lista do carrinho na tela ─────────────────────────────────────
function renderizarCarrinho() {
    const lista = document.getElementById('carrinho-lista');
    if (!lista) return;

    let itens = Carrinho.obterItens();
    // Limpeza de segurança: remove itens com defeito se houver
    const itensSaos = itens.filter(i => i.nome && i.preco != null && !isNaN(Number(i.preco)));
    if (itensSaos.length !== itens.length) {
        localStorage.setItem(Carrinho._chave, JSON.stringify(itensSaos));
        itens = itensSaos;
    }

    // Se a sacola estiver vazia, mostra mensagem amigável e botão para ir ao cardápio:
    if (itens.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-cart-x fs-1"></i>
                <p class="mt-3">Seu carrinho está vazio.</p>
                <a href="cardapio.html" class="btn btn-pastel mt-2">Ver cardápio</a>
            </div>`;
        _setResumo(0, 0); // Zera o valor total
        return;
    }

    // Cria uma linha visual para cada pastel (com nome, preço, caixinha de quantidade e lixeira):
    lista.innerHTML = itens.map(item => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-3 gap-3">
            <div class="flex-grow-1">
                <strong>${_escHtml(item.nome)}</strong>
                <div class="text-muted small">R$ ${formatarPrecoCarrinho(item.preco)} cada</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <!-- Campo para aumentar ou diminuir a quantidade -->
                <input type="number" min="1" value="${Number(item.quantidade)}"
                    class="form-control form-control-sm" style="width:70px"
                    onchange="Carrinho.alterarQuantidade('${_escHtml(item.id)}', this.value); renderizarCarrinho();">
                <!-- Subtotal deste pastel (quantidade x preço unitário) -->
                <span class="fw-bold" style="min-width:70px; text-align:right">
                    R$ ${formatarPrecoCarrinho(item.preco * item.quantidade)}
                </span>
                <!-- Botão de lixeira para excluir -->
                <button class="btn btn-sm btn-outline-danger"
                    onclick="Carrinho.removerItem('${_escHtml(item.id)}'); renderizarCarrinho();"
                    title="Remover">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Atualiza a caixinha lateral com o valor final da compra:
    _setResumo(Carrinho.obterQuantidadeTotal(), Carrinho.obterTotal());
}

// Atualiza os textos de Subtotal e Total na tela
function _setResumo(qtd, total) {
    const elQtd      = document.getElementById('carrinho-quantidade');
    const elSubtotal = document.getElementById('carrinho-subtotal');
    const elTotal    = document.getElementById('carrinho-total');
    if (elQtd)      elQtd.textContent      = qtd;
    if (elSubtotal) elSubtotal.textContent = `R$ ${formatarPrecoCarrinho(total)}`;
    if (elTotal)    elTotal.textContent    = `R$ ${formatarPrecoCarrinho(total)}`;
}

// Evita erros de caracteres especiais no texto (segurança básica)
function _escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Abre a janela para fechar o pedido ──────────────────────────────────────
function abrirModalFinalizar() {
    const itens = Carrinho.obterItens();
    // 1. Não deixa finalizar se a sacola estiver vazia
    if (itens.length === 0) {
        alert('Adicione produtos ao carrinho antes de finalizar.');
        return;
    }

    // 2. Não deixa pedir sem estar logado
    if (typeof estaLogado === 'function' && !estaLogado()) {
        alert('Você precisa entrar na sua conta para finalizar o pedido.');
        window.location.href = 'login.html';
        return;
    }

    // 3. Administrador não pode fazer pedido (apenas clientes)
    if (typeof ehAdministrador === 'function' && ehAdministrador()) {
        alert('Contas de administrador não realizam pedidos. Entre com uma conta de cliente.');
        return;
    }

    // Coloca a quantidade e o total na janelinha
    const elQtd   = document.getElementById('modal-qtd-itens');
    const elTotal = document.getElementById('modal-total');
    if (elQtd)   elQtd.textContent   = Carrinho.obterQuantidadeTotal() + ' item(s)';
    if (elTotal) elTotal.textContent = `R$ ${formatarPrecoCarrinho(Carrinho.obterTotal())}`;

    // Pega o telefone do cliente já cadastrado e preenche automaticamente
    const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
    const telInput = document.getElementById('finalizar-telefone');
    if (telInput && usuario?.telefone) telInput.value = usuario.telefone;

    // Abre a janela de confirmação
    const form = document.getElementById('formFinalizarPedido');
    if (form) { form.classList.remove('was-validated'); }
    document.getElementById('modal-alert-container').innerHTML = '';

    new bootstrap.Modal(document.getElementById('modalFinalizarPedido')).show();
}

// Alterna o campo de endereço: mostra se for entrega, esconde se for retirada no balcão
function _configurarEntrega() {
    const select    = document.getElementById('finalizar-tipo-entrega');
    const container = document.getElementById('finalizar-endereco-container');
    const input     = document.getElementById('finalizar-endereco');
    if (!select) return;

    select.addEventListener('change', () => {
        const delivery = select.value === 'DELIVERY';
        container.hidden  = !delivery; // Esconde ou mostra
        input.required    = delivery;  // Se for entrega, o endereço é obrigatório
    });
}

// ─── Envia o pedido definitivo para a pastelaria ─────────────────────────────
async function finalizarPedido() {
    const form = document.getElementById('formFinalizarPedido');
    if (!form) return;

    // Checa se todos os campos foram preenchidos corretamente
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

    // Monta o "pacote" com todos os dados do pedido para enviar ao servidor:
        // Monta os dados completos do pedido
    const usuarioLogado = (typeof obterUsuarioLogado === 'function')
        ? obterUsuarioLogado()
        : null;

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

        // Salva também nome e preço de cada produto
        itens: itens.map(i => ({
            idProduto: String(i.id),
            nome: i.nome,
            preco: Number(i.preco),
            precoUnitario: Number(i.preco),
            quantidade: parseInt(i.quantidade, 10)
        })),

        precoTotal: Carrinho.obterTotal()
    };
    

    try {
        // Envia o pedido para o sistema da pastelaria:
        const pedidoCriado = await window.api.criarPedido(payload);

        // Pedido deu certo! Esvazia o carrinho e redesenha a tela:
        Carrinho.limpar();
        renderizarCarrinho();

        // Fecha a janelinha
        bootstrap.Modal.getInstance(document.getElementById('modalFinalizarPedido')).hide();

        // Leva o cliente imediatamente para a tela de acompanhamento do pedido
        const idRetornado = pedidoCriado?.id || pedidoCriado?.numero || '';
        setTimeout(() => {
            window.location.href = idRetornado ? `acompanhamento.html?id=${idRetornado}` : 'acompanhamento.html';
        }, 800);

    } catch (erro) {
        console.error('[finalizarPedido]', erro);
        _mostrarAlertaModal(`Erro ao criar pedido: ${erro.message}`, 'danger');
    } finally {
        _setBotaoCarregando(false); // Libera o botão
    }
}

// Mostra o spinnerzinho de "enviando pedido..." no botão
function _setBotaoCarregando(ativo) {
    const btn     = document.getElementById('btn-confirmar-pedido');
    const texto   = document.getElementById('btn-confirmar-texto');
    const loading = document.getElementById('btn-confirmar-loading');
    if (!btn) return;
    btn.disabled       = ativo;
    texto.hidden       = ativo;
    loading.hidden     = !ativo;
}

// Mostra aviso de erro dentro da janela
function _mostrarAlertaModal(msg, tipo = 'danger') {
    const container = document.getElementById('modal-alert-container');
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show py-2" role="alert">
            ${_escHtml(msg)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
}

// ─── Quando a página abre, ativa os botões e carrega a lista ────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Botão que abre a janela de finalizar compra
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', abrirModalFinalizar);
    }

    // Botão verde que confirma e envia o pedido
    const btnConfirmar = document.getElementById('btn-confirmar-pedido');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', finalizarPedido);
    }

    // Configura a troca entre entrega ou retirada
    _configurarEntrega();

    // Se estiver na tela do carrinho, desenha os itens
    if (document.getElementById('carrinho-lista')) {
        renderizarCarrinho();
    }
});
