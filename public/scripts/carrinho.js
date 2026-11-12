
document.addEventListener('DOMContentLoaded', () => {

    if (typeof obterUsuarioLogado !== 'function') {
        console.error('Função obterUsuarioLogado não encontrada.');
        return;
    }

    const usuario = obterUsuarioLogado();

    if (!usuario) {
        alert('Faça login para acessar seu carrinho.');
        window.location.href = 'login.html';
        return;
    }

    const tipoUsuario = String(
        usuario.tipo || usuario.perfil || usuario.papel || ''
    ).toUpperCase();

    if (tipoUsuario !== 'CLIENTE') {
        alert('O carrinho está disponível apenas para clientes.');
        window.location.href = 'index.html';
        return;
    }

    if (typeof Carrinho === 'undefined') {
        console.error('Serviço de carrinho não encontrado.');
        return;
    }

    renderizarCarrinho();

    document.getElementById('btn-finalizar')
        .addEventListener('click', finalizarPedido);
});


function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}


function renderizarCarrinho() {

    const lista = document.getElementById('carrinho-lista');
    const itens = Carrinho.obterItens();

    const quantidade = Carrinho.obterQuantidadeTotal();
    const total = Carrinho.obterTotal();

    document.getElementById('carrinho-quantidade').textContent = quantidade;
    document.getElementById('carrinho-subtotal').textContent = formatarMoeda(total);
    document.getElementById('carrinho-total').textContent = formatarMoeda(total);

    Carrinho.atualizarBadgeNav();

    if (!itens || itens.length === 0) {

        lista.innerHTML = `
            <div class="carrinho-vazio">
                <div style="font-size: 55px;">🥟</div>
                <h3>Seu carrinho está vazio!</h3>
                <p>Você ainda não adicionou nenhum produto.</p>
                <a href="cardapio.html" class="btn btn-warning mt-3">
                    Ver cardápio
                </a>
            </div>
        `;

        return;
    }

    lista.innerHTML = itens.map(item => {

        const imagem = item.imagem
            ? `<img src="${escaparHTML(item.imagem)}"
                    class="produto-imagem"
                    alt="${escaparHTML(item.nome)}">`
            : `<div class="produto-imagem d-flex align-items-center justify-content-center">
                    <span style="font-size: 35px;">🥟</span>
               </div>`;

        return `
            <div class="carrinho-card">
                <div class="row align-items-center g-3">

                    <div class="col-4 col-md-3 text-center">
                        ${imagem}
                    </div>

                    <div class="col-8 col-md-5">
                        <div class="produto-nome">
                            ${escaparHTML(item.nome)}
                        </div>

                        <div class="produto-descricao">
                            ${escaparHTML(item.descricao || '')}
                        </div>

                        <div class="produto-preco mt-2">
                            ${formatarMoeda(item.preco)}
                        </div>
                    </div>

                    <div class="col-7 col-md-2">
                        <label class="form-label small mb-1">
                            Quantidade
                        </label>

                        <input
                            type="number"
                            class="form-control quantidade-input"
                            min="1"
                            value="${Number(item.quantidade) || 1}"
                            onchange="alterarQuantidade('${escaparHTML(item.idProduto)}', this.value)">
                    </div>

                    <div class="col-5 col-md-2 text-end">
                        <strong>
                            ${formatarMoeda(item.subtotal)}
                        </strong>

                        <br>

                        <button
                            class="btn-remover mt-2"
                            onclick="removerProduto('${escaparHTML(item.idProduto)}')">
                            Remover
                        </button>
                    </div>

                </div>
            </div>
        `;

    }).join('');
}


function alterarQuantidade(idProduto, quantidade) {
    Carrinho.alterarQuantidade(idProduto, quantidade);
    renderizarCarrinho();
}


function removerProduto(idProduto) {

    const confirmar = confirm(
        'Tem certeza que deseja remover este produto do carrinho?'
    );

    if (!confirmar) return;

    Carrinho.removerItem(idProduto);
    renderizarCarrinho();
}


function finalizarPedido() {

    const itens = Carrinho.obterItens();

    if (!itens || itens.length === 0) {
        alert('Adicione produtos ao carrinho antes de finalizar.');
        return;
    }

    alert(
        'Seu carrinho está pronto! A finalização ainda precisa ser conectada ao serviço de pedidos.'
    );
}
