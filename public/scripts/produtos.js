/**
 * produtos.js
 * Administração de categorias e produtos (sem autenticação por enquanto).
 */

let categoriasCache = [];
let todosProdutos = []; // cache local para o filtro por categoria
let _idCategoriaPendente = null; // id da categoria aguardando confirmação de exclusão
let _categoriaFiltroAtiva = null; // null = "Todos"

document.addEventListener('DOMContentLoaded', async () => {
    exigirAdministrador();

    await carregarCategorias();
    carregarProdutos();

    document.getElementById('categoriaForm').addEventListener('submit', criarCategoria);
    document.getElementById('btnNovoProduto').addEventListener('click', abrirModalNovoProduto);
    document.getElementById('btnSalvarProduto').addEventListener('click', salvarProduto);

    // Botão de confirmação do modal de exclusão de categoria
    document.getElementById('btnConfirmarExcluirCategoria').addEventListener('click', async () => {
        if (!_idCategoriaPendente) return;
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarExclusaoCategoriaModal'));
        modal.hide();
        await removerCategoria(_idCategoriaPendente);
        _idCategoriaPendente = null;
    });
});

// ─── Categorias ────────────────────────────────────────────────────────────────

async function carregarCategorias() {
    try {
        const pagina = await window.api.getCategorias();
        categoriasCache = pagina.content || pagina;
        renderizarCategorias();
        preencherSelectCategorias();
    } catch (erro) {
        mostrarAlerta('Não foi possível carregar as categorias.', 'danger');
    }
}

function renderizarCategorias() {
    const container = document.getElementById('categorias-list');
    container.innerHTML = '';

    // Pill "Todos" — sem id de categoria, mostra tudo
    const pillTodos = document.createElement('span');
    pillTodos.className = 'badge-tipo rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 categoria-filtro-pill active';
    pillTodos.style.cursor = 'pointer';
    pillTodos.dataset.id = '';
    pillTodos.textContent = 'Todos';
    pillTodos.onclick = () => ativarFiltroPill(null, pillTodos);
    container.appendChild(pillTodos);

    if (categoriasCache.length === 0) return;

    categoriasCache.forEach((categoria) => {
        const pill = document.createElement('span');
        pill.className = 'badge-tipo rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 categoria-filtro-pill';
        pill.style.cursor = 'pointer';
        pill.dataset.id = categoria.id;
        pill.innerHTML = `
            <span class="pill-nome">${categoria.nome}</span>
            <button type="button" class="btn-excluir-categoria" title="Excluir categoria" aria-label="Excluir ${categoria.nome}"
                style="background:none;border:none;padding:0;cursor:pointer;line-height:1;color:inherit;opacity:0.75;font-size:0.85rem;">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        // Clique no nome filtra; clique no X exclui
        pill.querySelector('.pill-nome').onclick = () => ativarFiltroPill(categoria.id, pill);
        pill.querySelector('.btn-excluir-categoria').onclick = (e) => {
            e.stopPropagation();
            confirmarExclusaoCategoria(categoria.id, categoria.nome);
        };
        container.appendChild(pill);
    });
}

/** Aplica o filtro visual e no grid ao clicar em um pill */
function ativarFiltroPill(idCategoria, pillClicado) {
    document.querySelectorAll('.categoria-filtro-pill').forEach((p) => p.classList.remove('active'));
    pillClicado.classList.add('active');
    _categoriaFiltroAtiva = idCategoria;

    if (!idCategoria) {
        renderizarProdutos(todosProdutos);
        return;
    }
    const filtrados = todosProdutos.filter(
        (produto) => String(obterIdCategoria(produto)) === String(idCategoria)
    );
    renderizarProdutos(filtrados);
}

function preencherSelectCategorias() {
    const select = document.getElementById('produto-categoria');
    select.innerHTML = '<option value="">Selecione</option>';
    categoriasCache.forEach((categoria) => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        select.appendChild(option);
    });
}

async function criarCategoria(evento) {
    evento.preventDefault();
    const input = document.getElementById('categoria-nome');
    try {
        await window.api.criarCategoria({ nome: input.value });
        input.value = '';
        mostrarAlerta('Categoria criada.', 'success');
        await carregarCategorias();
    } catch (erro) {
        mostrarAlerta(`Erro ao criar categoria: ${erro.message}`, 'danger');
    }
}

async function removerCategoria(id) {
    try {
        await window.api.removerCategoria(id);
        mostrarAlerta('Categoria removida.', 'success');
        await carregarCategorias();
        await carregarProdutos();
    } catch (erro) {
        mostrarAlerta(`Erro ao remover categoria: ${erro.message}`, 'danger');
    }
}

// ─── Produtos ──────────────────────────────────────────────────────────────────

async function carregarProdutos() {
    const container = document.getElementById('produtos-grid');
    try {
        const pagina = await window.api.getProdutos();
        todosProdutos = pagina.content || pagina;
        // Respeita o filtro de categoria que estava ativo
        if (_categoriaFiltroAtiva) {
            const filtrados = todosProdutos.filter(
                (p) => String(obterIdCategoria(p)) === String(_categoriaFiltroAtiva)
            );
            renderizarProdutos(filtrados);
        } else {
            renderizarProdutos(todosProdutos);
        }
    } catch (erro) {
        container.innerHTML = '<div class="col-12"><p class="text-center">Não foi possível carregar os produtos.</p></div>';
    }
}

function renderizarProdutos(produtos) {
    const container = document.getElementById('produtos-grid');
    container.innerHTML = '';

    if (produtos.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted">Nenhum produto nessa categoria.</p></div>';
        return;
    }

    produtos.forEach((produto) => {
        const categoria = categoriasCache.find((c) => String(c.id) === obterIdCategoria(produto));

        // Prévia da imagem (se houver)
        let imagemHTML = '';
        if (produto.imagem) {
            imagemHTML = /[\/.]/.test(produto.imagem)
                ? `<img src="${produto.imagem}" alt="${produto.nome}" class="cardapio-img rounded mb-2">`
                : `<span class="fs-2 d-block mb-2">${produto.imagem}</span>`;
        }

        const coluna = document.createElement('div');
        coluna.className = 'col-md-4 col-sm-12 mb-4';
        coluna.innerHTML = `
            <div class="border rounded p-3 h-100 d-flex flex-column">
                ${imagemHTML}
                <div class="d-flex justify-content-between align-items-start">
                    <h5>${produto.nome}</h5>
                    <span class="badge-tipo rounded-pill px-2 py-1 small">${categoria ? categoria.nome : '—'}</span>
                </div>
                <p class="text-muted small">${produto.descricao || ''}</p>
                <p class="mb-2">R$ ${formatarPreco(produto.preco)}</p>
                <div class="mt-auto d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary">Editar</button>
                    <button type="button" class="btn btn-sm btn-outline-danger">Excluir</button>
                </div>
            </div>
        `;
        coluna.querySelector('.btn-outline-secondary').onclick = () => abrirModalEditarProduto(produto);
        coluna.querySelector('.btn-outline-danger').onclick = () => excluirProduto(produto.id);
        container.appendChild(coluna);
    });
}

// ─── Modal de produto ──────────────────────────────────────────────────────────

function abrirModalNovoProduto() {
    document.getElementById('produtoForm').reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('produtoModalTitulo').textContent = 'Novo produto';
    new bootstrap.Modal(document.getElementById('produtoModal')).show();
}

function abrirModalEditarProduto(produto) {
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-descricao').value = produto.descricao || '';
    document.getElementById('produto-preco').value = produto.preco;
    document.getElementById('produto-categoria').value = obterIdCategoria(produto);
    document.getElementById('produto-imagem').value = produto.imagem || '';
    document.getElementById('produtoModalTitulo').textContent = 'Editar produto';
    new bootstrap.Modal(document.getElementById('produtoModal')).show();
}

async function salvarProduto() {
    const form = document.getElementById('produtoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('produto-id').value;
    const produto = {
        nome: document.getElementById('produto-nome').value,
        descricao: document.getElementById('produto-descricao').value || null,
        preco: parseFloat(document.getElementById('produto-preco').value),
        idCategoria: document.getElementById('produto-categoria').value,
        imagem: document.getElementById('produto-imagem').value || null
    };

    try {
        if (id) {
            await window.api.atualizarProduto(id, produto);
            mostrarAlerta('Produto atualizado.', 'success');
        } else {
            await window.api.criarProduto(produto);
            mostrarAlerta('Produto criado.', 'success');
        }
        bootstrap.Modal.getInstance(document.getElementById('produtoModal')).hide();
        await carregarProdutos();
    } catch (erro) {
        mostrarAlerta(`Erro ao salvar produto: ${erro.message}`, 'danger');
    }
}

async function excluirProduto(id) {
    if (!confirm('Excluir este produto?')) return;
    try {
        await window.api.removerProduto(id);
        mostrarAlerta('Produto removido.', 'success');
        await carregarProdutos();
    } catch (erro) {
        mostrarAlerta(`Erro ao remover produto: ${erro.message}`, 'danger');
    }
}
