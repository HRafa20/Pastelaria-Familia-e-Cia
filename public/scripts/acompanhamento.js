
// Busca os pedidos salvos no navegador
let pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

const listaPedidos = document.getElementById("lista-pedidos");

// Etapas do pedido
const etapas = [
    "CRIADO",
    "EM_PREPARO",
    "SAIU_PARA_ENTREGA",
    "CONCLUIDO"
];

// Ícones de cada etapa
const icones = [
    "bi-receipt",
    "bi-fire",
    "bi-bicycle",
    "bi-check-circle"
];

// Mostra os pedidos na tela
function mostrarPedidos() {

    listaPedidos.innerHTML = "";

    // Se não houver pedidos
    if (pedidos.length === 0) {

        listaPedidos.innerHTML = `
            <div class="sem-pedidos">

                <div class="icone-vazio">
                    <i class="bi bi-bag-x"></i>
                </div>

                <h4>Nenhum pedido encontrado</h4>

                <p>
                    Você ainda não realizou nenhum pedido.
                    Que tal escolher seu pastel favorito?
                </p>

                <a href="cardapio.html" class="btn-acompanhamento">
                    <i class="bi bi-shop"></i>
                    Ver cardápio
                </a>

            </div>
        `;

        return;
    }

    // Percorre os pedidos
    pedidos.forEach(function(pedido) {

        let posicao = etapas.indexOf(pedido.status);

        if (posicao === -1) {
            posicao = 0;
        }

        // Monta as etapas
        let etapasHTML = "";

        etapas.forEach(function(etapa, indice) {

            let classe = "";

            if (indice <= posicao) {
                classe = "concluida";
            }

            etapasHTML += `
                <div class="etapa ${classe}">

                    <div class="icone">
                        <i class="bi ${icones[indice]}"></i>
                    </div>

                    <p>${etapa.replaceAll("_", " ")}</p>

                </div>
            `;
        });

        // Monta os produtos
        let produtosHTML = "";

        if (pedido.itens) {

            pedido.itens.forEach(function(item) {

                produtosHTML += `
                    <div class="produto-item">

                        <span>
                            ${item.quantidade || 1}x ${item.nome}
                        </span>

                        <strong>
                            R$ ${Number(item.preco || 0).toFixed(2).replace(".", ",")}
                        </strong>

                    </div>
                `;
            });
        }

        // Mostra o pedido
        listaPedidos.innerHTML += `

            <div class="pedido-card">

                <div class="pedido-topo">

                    <div>
                        <h4>Pedido #${pedido.id || pedido.numero || ""}</h4>
                        <p class="mb-0">Acompanhe o preparo e a entrega</p>
                    </div>

                    <span class="status-atual">
                        ${pedido.status ? pedido.status.replaceAll("_", " ") : "CRIADO"}
                    </span>

                </div>

                <h5 class="titulo-etapas">Andamento do pedido</h5>

                <div class="etapas">
                    ${etapasHTML}
                </div>

                <div class="produtos-pedido">

                    <h5>Resumo do pedido</h5>

                    ${produtosHTML || "<p>Nenhum produto informado.</p>"}

                </div>

                <div class="informacoes-pedido">

                    <div class="info-box">
                        <i class="bi bi-geo-alt"></i>
                        <strong>Endereço de entrega</strong>
                        <p>${pedido.endereco || "Não informado"}</p>
                    </div>

                    <div class="info-box">
                        <i class="bi bi-credit-card"></i>
                        <strong>Forma de pagamento</strong>
                        <p>${pedido.pagamento || "Não informado"}</p>
                    </div>

                </div>

                <div class="total-pedido">
                    Total: R$ ${Number(pedido.total || 0).toFixed(2).replace(".", ",")}
                </div>

            </div>

        `;

    });

}

// Executa quando abrir a página
mostrarPedidos();

// Atualiza quando os pedidos mudarem em outra aba
window.addEventListener("storage", function() {

    pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

    mostrarPedidos();

});
