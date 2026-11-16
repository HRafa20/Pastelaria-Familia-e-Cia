/**
 * cardapio.js
 * Carrega categorias e produtos da API e monta o pedido pelo modal.
 */

let produtosCarregados = [];
let categoriaAtiva = null; // null = "Todas"

document.addEventListener('DOMContentLoaded', () => {
    carregarCategorias();
    carregarProdutos();

    document.getElementById('pedido-tipo-entrega').addEventListener('change', (evento) => {
        const enderecoContainer = document.getElementById('pedido-endereco-container');
        const enderecoInput = document.getElementById('pedido-endereco');
        const precisaEndereco = evento.target.value === 'DELIVERY';
        enderecoContainer.hidden = !precisaEndereco;
        enderecoInput.required = precisaEndereco;
    });

    document.getElementById('btnConfirmarPedido').addEventListener('click', () => confirmarPedido(false));
    const btnPedirAgora = document.getElementById('btnPedirAgora');
    if (btnPedirAgora) {
        btnPedirAgora.addEventListener('click', () => confirmarPedido(true));
    }
});

async function carregarCategorias() {
    const container = document.getElementById('categorias-filtro');
    try {
        const pagina = await window.api.getCategorias();
        const categorias = pagina.content || pagina;

        container.innerHTML = '';

        // Botão "Todas" — sem id de categoria, mostra tudo
        const btnTodas = document.createElement('button');
        btnTodas.type = 'button';
        btnTodas.className = 'btn btn-outline-secondary categoria-filtro active';
        btnTodas.textContent = 'Todas';
        btnTodas.onclick = () => filtrarPorCategoria(null, btnTodas);
        container.appendChild(btnTodas);



        // Botões dinâmicos vindos da API/mock
        categorias.forEach((categoria) => {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'btn btn-outline-secondary categoria-filtro';
            botao.textContent = categoria.nome;
            botao.onclick = () => filtrarPorCategoria(categoria.id || categoria.nome, botao);
            container.appendChild(botao);
        });
    } catch (erro) {
        mostrarAlerta('Não foi possível carregar as categorias.', 'danger');
    }
}

async function carregarProdutos() {
    const container = document.getElementById('produtos-list');
    try {
        const pagina = await window.api.getProdutos();
        produtosCarregados = pagina.content || pagina;
        renderizarProdutos(produtosCarregados);
    } catch (erro) {
        container.innerHTML = '<div class="col-12"><p class="text-center">Não foi possível carregar o cardápio. O back-end está rodando?</p></div>';
    }
}

function renderizarProdutos(produtos) {
    const container = document.getElementById('produtos-list');
    container.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Nenhum produto nessa categoria.</p></div>';
        return;
    }

    produtos.forEach((produto) => {
        // Se "imagem" for um caminho/URL vira <img>; se for só um emoji, mostra como texto
        let imagemHTML = '';
        if (produto.imagem) {
            imagemHTML = /[\/.]/.test(produto.imagem)
                ? `<img src="${produto.imagem}" alt="${produto.nome}" class="cardapio-img rounded">`
                : `<span class="fs-1">${produto.imagem}</span>`;
        }
        const coluna = document.createElement('div');
        coluna.className = 'col-md-4 col-sm-12 mb-4';
        coluna.innerHTML = `
            <div class="border rounded p-3 h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <h5>${produto.nome}</h5>
                        <p class="text-muted small">${produto.descricao || ''}</p>
                    </div>
                    ${imagemHTML}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto pt-3">
                    <p class="mb-0">R$ ${formatarPreco(produto.preco)}</p>
                    <button type="button" class="btn btn-sm btn-nonna" onclick="abrirModalPedido('${produto.id}')">Pedir</button>
                </div>
            </div>
        `;
        container.appendChild(coluna);
    });
}

async function filtrarPorCategoria(categoriaFiltro, botaoClicado) {
    // Atualiza estado visual dos botões
    document.querySelectorAll('.categoria-filtro').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');

    if (!categoriaFiltro) {
        renderizarProdutos(produtosCarregados);
        return;
    }

    const filtrados = produtosCarregados.filter(p => {
        const catId = p.idCategoria ?? p.id_categoria ?? p.categoriaId ?? p.categoria?.id ?? p.categoria;
        const catNome = p.categoria?.nome ?? p.categoriaNome ?? '';
        return String(catId) === String(categoriaFiltro) || 
               String(catNome).toLowerCase() === String(categoriaFiltro).toLowerCase();
    });

    renderizarProdutos(filtrados);
}

function abrirModalPedido(idProduto) {
    if (!estaLogado()) {
        mostrarAlerta('Você precisa entrar na sua conta para fazer um pedido.', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    if (ehAdministrador()) {
        mostrarAlerta('Contas de administrador não fazem pedido -- entre com uma conta de cliente.', 'warning');
        return;
    }

    const produto = produtosCarregados.find((item) => String(item.id) === String(idProduto));
    if (!produto) return;

    document.getElementById('pedidoForm').reset();
    document.getElementById('pedido-id-produto').value = produto.id;
    document.getElementById('pedido-produto-nome').textContent = produto.nome;
    document.getElementById('pedido-produto-preco').textContent = formatarPreco(produto.preco);
    document.getElementById('pedido-endereco-container').hidden = true;

    new bootstrap.Modal(document.getElementById('pedidoModal')).show();
}

async function confirmarPedido(irParaCarrinho = false) {
    const form = document.getElementById('pedidoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const pedido = {
        tipoEntrega: document.getElementById('pedido-tipo-entrega').value,
        endereco: document.getElementById('pedido-endereco').value || null,
        formaPagamento: document.getElementById('pedido-forma-pagamento').value,
        telefone: document.getElementById('pedido-telefone').value,
        itens: [{
            idProduto: document.getElementById('pedido-id-produto').value,
            quantidade: parseInt(document.getElementById('pedido-quantidade').value, 10)
        }]
    };

    const botao = document.getElementById('btnConfirmarPedido');
    botao.disabled = true;
    
    const produtoSelecionado = produtosCarregados.find(
        (p) => String(p.id) === String(pedido.itens[0].idProduto)
    );

    try {
        Carrinho.adicionarItem({
            id: pedido.itens[0].idProduto,
            quantidade: pedido.itens[0].quantidade,
            nome: produtoSelecionado ? produtoSelecionado.nome : '',
            preco: produtoSelecionado ? produtoSelecionado.preco : 0
        });
        
        bootstrap.Modal.getInstance(document.getElementById('pedidoModal')).hide();

        if (irParaCarrinho) {
            window.location.href = 'carrinho.html';
        } else {
            mostrarAlerta('Produto adicionado ao carrinho com sucesso!', 'success');
        }
    } catch (erro) {
        mostrarAlerta(`Erro ao adicionar ao carrinho: ${erro.message}`, 'danger');
    } finally {
        botao.disabled = false;
    }
}
