/**
 * ui.js - Os "Ajudantes Visuais" da Tela
 
 */

// Mostra uma caixinha de aviso colorida no topo da tela e faz ela sumir sozinha depois de 6 segundos:
function mostrarAlerta(mensagem, tipo = 'success') {
    const container = document.getElementById('alert-container');
    if (!container) return; // Se a tela não tiver onde colocar o alerta, não faz nada
    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela para a pessoa ver o aviso
    // Reloginho: depois de 6 segundos, fecha o aviso automaticamente
    setTimeout(() => {
        const alertNode = container.querySelector('.alert');
        if (alertNode) bootstrap.Alert.getOrCreateInstance(alertNode).close();
    }, 6000);
}

// Transforma número de computador em dinheiro brasileiro (ex: 12.5 vira "12,50"):
function formatarPreco(valor) {
    return Number(valor).toFixed(2).replace('.', ',');
}

// Descobre o código da categoria do pastel sem deixar o sistema quebrar:
function obterIdCategoria(produto) {
    const id = produto.idCategoria ?? produto.id_categoria ?? produto.categoriaId ?? produto.categoria?.id ?? produto.categoria;
    return id === undefined || id === null ? '' : String(id);
}
