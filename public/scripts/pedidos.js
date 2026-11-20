/**
 * pedidos.js - Painel de Controle da Cozinha (Visão do Dono/Admin)
 
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cadeado de segurança: se não for o dono, expulsa daqui
    exigirAdministrador();

    // 2. Busca e monta a lista de pedidos na tabela
    carregarPedidos();
    
    // Liga os botões de salvar alteração e de cancelar pedido
    document.getElementById('btnAtualizarPedido').addEventListener('click', atualizarStatus);
    document.getElementById('btnCancelarPedido').addEventListener('click', cancelarPedido);
});

// Pergunta para o sistema quais pedidos foram feitos
async function carregarPedidos() {
    const corpo = document.getElementById('pedidos-tbody');
    try {
        const pagina = await window.api.getPedidos();
        renderizarPedidos(pagina.content); // Manda desenhar na tabela
    } catch (erro) {
        corpo.innerHTML = '<tr><td colspan="6" class="text-center">Não foi possível carregar os pedidos.</td></tr>';
    }
}

// Cria uma linha na tabela para cada pedido com data, cliente, tipo, total e botão "Ver"
function renderizarPedidos(pedidos) {
    const corpo = document.getElementById('pedidos-tbody');
    corpo.innerHTML = ''; // Limpa antes

    if (pedidos.length === 0) {
        corpo.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum pedido em aberto.</td></tr>';
        return;
    }

    // Desenha cada linha da tabela:
    pedidos.forEach((pedido) => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${new Date(pedido.horarioCriacao).toLocaleString('pt-BR')}</td>
            <td>${pedido.idUsuario}</td>
            <td>${pedido.tipoEntrega}</td>
            <td>R$ ${formatarPreco(pedido.precoTotal)}</td>
            <td>${pedido.status}</td>
            <td><button type="button" class="btn btn-sm btn-nonna">Ver</button></td>
        `;
        // Ao clicar em "Ver", abre a comanda detalhada
        linha.querySelector('button').onclick = () => abrirDetalhe(pedido.id);
        corpo.appendChild(linha);
    });
}

// Abre a comanda detalhada do pedido em uma janela (modal)
async function abrirDetalhe(id) {
    try {
        const pedido = await window.api.getPedido(id);

        // Preenche os dados do cliente e entrega na janelinha:
        document.getElementById('detalhe-id').value = pedido.id;
        document.getElementById('detalhe-usuario').textContent = pedido.idUsuario;
        document.getElementById('detalhe-entrega').textContent = `${pedido.tipoEntrega}${pedido.endereco ? ' — ' + pedido.endereco : ''}`;
        document.getElementById('detalhe-telefone').textContent = pedido.telefone;
        document.getElementById('detalhe-pagamento').textContent = pedido.formaPagamento;
        document.getElementById('detalhe-status').value = pedido.status;
        document.getElementById('detalhe-total').textContent = formatarPreco(pedido.precoTotal);

        // Preenche a lista com os sabores e quantidades dos pastéis:
        const corpoItens = document.getElementById('detalhe-itens');
        corpoItens.innerHTML = '';
        pedido.itens.forEach((item) => {
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${item.idProduto}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${formatarPreco(item.precoUnitario)}</td>
                <td>R$ ${formatarPreco(item.subtotal)}</td>
            `;
            corpoItens.appendChild(linha);
        });

        // Mostra a janela na tela
        new bootstrap.Modal(document.getElementById('pedidoModal')).show();
    } catch (erro) {
        mostrarAlerta(`Não foi possível abrir o pedido: ${erro.message}`, 'danger');
    }
}

// Quando o dono muda o status (ex: de "Em Preparo" para "Saiu para Entrega") e clica em Salvar:
async function atualizarStatus() {
    const id = document.getElementById('detalhe-id').value;
    const horarioSaida = document.getElementById('detalhe-horario-saida').value;
    const horarioFinalizacao = document.getElementById('detalhe-horario-finalizacao').value;

    const dados = {
        status: document.getElementById('detalhe-status').value,
        horarioSaida: horarioSaida ? `${horarioSaida}:00` : null,
        horarioFinalizacao: horarioFinalizacao ? `${horarioFinalizacao}:00` : null
    };

    try {
        await window.api.atualizarPedido(id, dados); // Envia o novo status
        bootstrap.Modal.getInstance(document.getElementById('pedidoModal')).hide(); // Fecha a janela
        mostrarAlerta('Pedido atualizado.', 'success');
        await carregarPedidos(); // Atualiza a tabela na hora
    } catch (erro) {
        mostrarAlerta(`Erro ao atualizar pedido: ${erro.message}`, 'danger');
    }
}

// Botão de cancelar o pedido (pergunta o motivo e registra no sistema)
async function cancelarPedido() {
    const id = document.getElementById('detalhe-id').value;
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo === null) return; // Se clicou em cancelar no prompt, não faz nada

    try {
        await window.api.cancelarPedido(id, motivo);
        bootstrap.Modal.getInstance(document.getElementById('pedidoModal')).hide();
        mostrarAlerta('Pedido cancelado.', 'success');
        await carregarPedidos();
    } catch (erro) {
        mostrarAlerta(`Erro ao cancelar pedido: ${erro.message}`, 'danger');
    }
}
    const id = document.getElementById('detalhe-id').value;
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo === null) return;

    try {
        await window.api.cancelarPedido(id, motivo);
        bootstrap.Modal.getInstance(document.getElementById('pedidoModal')).hide();
        mostrarAlerta('Pedido cancelado.', 'success');
        await carregarPedidos();
    } catch (erro) {
        mostrarAlerta(`Erro ao cancelar pedido: ${erro.message}`, 'danger');
    }

