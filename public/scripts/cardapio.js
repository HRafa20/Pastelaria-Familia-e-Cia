/**
 * cardapio.js - Mostra o Cardápio e Permite Escolher os Pastéis
 */

let produtosCarregados = []; // Guarda os pastéis na memória para não precisar buscar toda hora
let categoriaAtiva = null;    // Guarda qual filtro está selecionado (null = mostra todos)

// Assim que a tela termina de abrir no celular do cliente, executa estas etapas:
document.addEventListener('DOMContentLoaded', () => {
    carregarCategorias(); // 1. Busca os botões de filtro (Salgados, Doces, Bebidas)
    carregarProdutos();   // 2. Busca e desenha os pastéis na tela

    // Botão "Adicionar ao carrinho" do modal -> só adiciona na sacola e fecha a janelinha
    document.getElementById('btnConfirmarPedido').addEventListener('click', () => confirmarPedido(false));
    
    // Botão "Pedir agora" -> adiciona na sacola e já leva direto para o carrinho
    const btnPedirAgora = document.getElementById('btnPedirAgora');
    if (btnPedirAgora) {
        btnPedirAgora.addEventListener('click', () => confirmarPedido(true));
    }
});

// Busca as categorias cadastradas e cria os botões no topo do cardápio
async function carregarCategorias() {
    const container = document.getElementById('categorias-filtro');
    try {
        const pagina = await window.api.getCategorias(); // Pergunta ao sistema quais categorias existem
        const categorias = pagina.content || pagina;

        container.innerHTML = ''; // Limpa antes de preencher

        // Cria o primeiro botão: "Todas" (para ver o cardápio completo)
        const btnTodas = document.createElement('button');
        btnTodas.type = 'button';
        btnTodas.className = 'btn btn-outline-secondary categoria-filtro active';
        btnTodas.textContent = 'Todas';
        btnTodas.onclick = () => filtrarPorCategoria(null, btnTodas); // Clicou em "Todas", mostra tudo
        container.appendChild(btnTodas);

        // Cria um botão para cada categoria que veio do banco (Salgados, Doces, etc.)
        categorias.forEach((categoria) => {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'btn btn-outline-secondary categoria-filtro';
            botao.textContent = categoria.nome;
            // Ao clicar, filtra só os pastéis dessa categoria:
            botao.onclick = () => filtrarPorCategoria(categoria, botao);
            container.appendChild(botao);
        });
    } catch (erro) {
        mostrarAlerta('Não foi possível carregar as categorias.', 'danger');
    }
}

// Busca todos os pastéis e chama a função de desenhar na tela
async function carregarProdutos() {
    const container = document.getElementById('produtos-list');
    try {
        const pagina = await window.api.getProdutos(); // Busca os pastéis
        produtosCarregados = pagina.content || pagina;  // Guarda na memória do navegador
        renderizarProdutos(produtosCarregados);          // Desenha na tela
    } catch (erro) {
        container.innerHTML = '<div class="col-12"><p class="text-center">Não foi possível carregar o cardápio. O back-end está rodando?</p></div>';
    }
}

// "Desenha" o visual de cada pastel na tela (com foto, nome, descrição e preço)
function renderizarProdutos(produtos) {
    const container = document.getElementById('produtos-list');
    container.innerHTML = ''; // Limpa a área antes de colocar os novos

    // Se não tiver nenhum pastel cadastrado ou nessa categoria:
    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Nenhum produto nessa categoria.</p></div>';
        return;
    }

    // Passa de pastel em pastel criando o cartão visual dele:
    produtos.forEach((produto) => {
        // Prepara a foto do pastel (se não tiver imagem, não quebra a página)
        let imagemHTML = '';
        const urlImagem = produto.imagemUrl || produto.imagem;
        if (urlImagem) {
            imagemHTML = /[\/.]/.test(urlImagem)
                ? `<img src="${urlImagem}" alt="${produto.nome}" class="cardapio-img rounded">`
                : `<span class="fs-1">${urlImagem}</span>`;
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
                    <!-- Clicar em Pedir chama a janela com a quantidade -->
                    <button type="button" class="btn btn-sm btn-nonna" onclick="abrirModalPedido('${produto.id}')">Pedir</button>
                </div>
            </div>
        `;
        container.appendChild(coluna);
    });
}

// Filtra a lista de pastéis na hora, sem precisar recarregar a página
function filtrarPorCategoria(categoriaFiltro, botaoClicado) {
    // Muda a cor do botão clicado para mostrar qual está ativo
    document.querySelectorAll('.categoria-filtro').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');

    // Se clicou em "Todas", mostra a lista inteira
    if (!categoriaFiltro) {
        renderizarProdutos(produtosCarregados);
        return;
    }

    const filtrados = produtosCarregados.filter(p => produtoPertenceACategoria(p, categoriaFiltro));
    renderizarProdutos(filtrados); // Redesenha a tela só com os pastéis filtrados
}

// Verifica se um produto pertence a uma categoria considerando IDs, nomes ou termos (singular/plural)
function produtoPertenceACategoria(produto, categoriaAlvo) {
    if (!categoriaAlvo) return true;

    // Normaliza categoria alvo (pode ser objeto { id, nome } ou string)
    const idAlvo = typeof categoriaAlvo === 'object' ? String(categoriaAlvo.id ?? '') : String(categoriaAlvo);
    const nomeAlvo = typeof categoriaAlvo === 'object' ? String(categoriaAlvo.nome ?? '') : String(categoriaAlvo);

    // Campos de categoria do produto
    const idProd = String(produto.idCategoria ?? produto.id_categoria ?? produto.categoriaId ?? produto.categoria?.id ?? '').trim();
    const nomeProd = String(produto.categoria?.nome ?? produto.categoriaNome ?? produto.categoria ?? '').trim();

    // 1. Comparação direta por ID (ex: 'cat-pasteis', '1', etc)
    if (idAlvo && (idProd === idAlvo || String(produto.idCategoria) === idAlvo)) {
        return true;
    }

    // 2. Classificação precisa por grupo semântico (Doce, Bebida, Salgado)
    const textoAlvo = `${idAlvo} ${nomeAlvo}`.toLowerCase();
    const isAlvoDoce = textoAlvo.includes('doce') || textoAlvo.includes('cat-doces');
    const isAlvoBebida = textoAlvo.includes('bebid') || textoAlvo.includes('suco') || textoAlvo.includes('refrig') || textoAlvo.includes('cat-bebidas');
    const isAlvoSalgado = textoAlvo.includes('salgad') || textoAlvo.includes('cat-pasteis');

    const textoProd = `${idProd} ${nomeProd} ${produto.nome || ''}`.toLowerCase();
    const isProdDoce = textoProd.includes('doce') || textoProd.includes('cat-doces') || textoProd.includes('chocolate');
    const isProdBebida = textoProd.includes('bebid') || textoProd.includes('suco') || textoProd.includes('refrig') || textoProd.includes('cat-bebidas');
    const isProdSalgado = textoProd.includes('salgad') || textoProd.includes('cat-pasteis') || (!isProdDoce && !isProdBebida);

    // 3. Aplica o filtro estrito: Doce só mostra Doce, Bebida só mostra Bebida, Salgado só mostra Salgado
    if (isAlvoDoce) return isProdDoce;
    if (isAlvoBebida) return isProdBebida;
    if (isAlvoSalgado) return isProdSalgado && !isProdDoce && !isProdBebida;

    // 4. Fallback para categorias adicionais (compara texto exato sem acentos)
    const normAlvo = normalizarTexto(nomeAlvo || idAlvo);
    const normProd = normalizarTexto(nomeProd || idProd);
    return normAlvo === normProd || (normAlvo && normProd.includes(normAlvo));
}

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// Abre a janelinha (modal) com as informações do pastel que o cliente clicou
function abrirModalPedido(idProduto) {
    // Passo 1: Segurança - se não estiver logado, pede para entrar na conta
    if (!estaLogado()) {
        mostrarAlerta('Você precisa entrar na sua conta para fazer um pedido.', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    // Passo 2: O dono/administrador não faz pedido por essa tela
    if (ehAdministrador()) {
        mostrarAlerta('Contas de administrador não fazem pedido -- entre com uma conta de cliente.', 'warning');
        return;
    }

    // Passo 3: Encontra o pastel pelo ID e preenche o nome e preço na janelinha
    const produto = produtosCarregados.find((item) => String(item.id) === String(idProduto));
    if (!produto) return;

    document.getElementById('pedidoForm').reset();
    document.getElementById('pedido-id-produto').value = produto.id;
    document.getElementById('pedido-produto-nome').textContent = produto.nome;
    document.getElementById('pedido-produto-preco').textContent = formatarPreco(produto.preco);

    // Exibe a janelinha na tela
    new bootstrap.Modal(document.getElementById('pedidoModal')).show();
}

// Pega a quantidade escolhida na janelinha e adiciona ao carrinho
async function confirmarPedido(irParaCarrinho = false) {
    const form = document.getElementById('pedidoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const idProduto = document.getElementById('pedido-id-produto').value;
    const quantidade = parseInt(document.getElementById('pedido-quantidade').value, 10);

    const botao = document.getElementById('btnConfirmarPedido');
    botao.disabled = true; // Desativa o botão para evitar clique duplo

    const produtoSelecionado = produtosCarregados.find(
        (p) => String(p.id) === String(idProduto)
    );

    try {
        Carrinho.adicionarItem({
            id: idProduto,
            quantidade,
            nome: produtoSelecionado ? produtoSelecionado.nome : '',
            preco: produtoSelecionado ? produtoSelecionado.preco : 0
        });

        // Fecha a janelinha
        bootstrap.Modal.getInstance(document.getElementById('pedidoModal')).hide();

        if (irParaCarrinho) {
            window.location.href = 'carrinho.html'; // Vai direto fechar a compra
        } else {
            mostrarAlerta('Produto adicionado ao carrinho com sucesso!', 'success'); // Só avisa que adicionou
        }
    } catch (erro) {
        mostrarAlerta(`Erro ao adicionar ao carrinho: ${erro.message}`, 'danger');
    } finally {
        botao.disabled = false; // Reativa o botão
    }
}