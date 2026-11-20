/**
 * usuarios.js - Gestão de Acessos e Usuários (Painel do Dono)
 
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cadeado de segurança: só administradores entram aqui
    exigirAdministrador();

    // 2. Busca e monta a lista de usuários na tabela
    carregarUsuarios();
    
    // Liga os botões de criar novo usuário e de salvar alterações:
    document.getElementById('btnNovoUsuario').addEventListener('click', abrirModalNovoUsuario);
    document.getElementById('btnSalvarUsuario').addEventListener('click', salvarUsuario);
});

// Pergunta para o sistema quem são as pessoas cadastradas
async function carregarUsuarios() {
    const corpo = document.getElementById('usuarios-tbody');
    try {
        const pagina = await window.api.getUsuarios();
        renderizarUsuarios(pagina.content); // Manda desenhar na tabela
    } catch (erro) {
        corpo.innerHTML = '<tr><td colspan="5" class="text-center">Não foi possível carregar os usuários.</td></tr>';
    }
}

// Cria uma linha na tabela para cada pessoa cadastrada (com nome, e-mail, telefone e tipo)
function renderizarUsuarios(usuarios) {
    const corpo = document.getElementById('usuarios-tbody');
    corpo.innerHTML = ''; // Limpa a tabela antes de preencher

    if (usuarios.length === 0) {
        corpo.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum usuário cadastrado.</td></tr>';
        return;
    }

    // Desenha cada linha:
    usuarios.forEach((usuario) => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${usuario.nome}</td>
            <td>${usuario.email}</td>
            <td>${usuario.telefone || '—'}</td>
            <td><span class="badge-tipo rounded-pill px-2 py-1">${usuario.tipo}</span></td>
            <td><button type="button" class="btn btn-sm btn-outline-secondary">Editar</button></td>
        `;
        // Ao clicar em Editar, abre a janelinha com os dados dessa pessoa
        linha.querySelector('button').onclick = () => abrirModalEditarUsuario(usuario);
        corpo.appendChild(linha);
    });
}

// Abre a janelinha em branco para cadastrar alguém novo
function abrirModalNovoUsuario() {
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuarioModalTitulo').textContent = 'Novo usuário';
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// Abre a janelinha com os dados da pessoa já preenchidos para alterar
function abrirModalEditarUsuario(usuario) {
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nome').value = usuario.nome;
    document.getElementById('usuario-email').value = usuario.email;
    document.getElementById('usuario-senha').value = ''; // Senha fica em branco por segurança
    document.getElementById('usuario-telefone').value = usuario.telefone || '';
    document.getElementById('usuario-tipo').value = usuario.tipo;
    document.getElementById('usuarioModalTitulo').textContent = 'Editar usuário';
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// Salva a pessoa (se já existia, atualiza; se for nova, cria a conta):
async function salvarUsuario() {
    const form = document.getElementById('usuarioForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('usuario-id').value;
    const usuario = {
        nome: document.getElementById('usuario-nome').value,
        email: document.getElementById('usuario-email').value,
        senha: document.getElementById('usuario-senha').value,
        telefone: document.getElementById('usuario-telefone').value || null,
        tipo: document.getElementById('usuario-tipo').value
    };

    try {
        if (id) {
            await window.api.atualizarUsuario(id, usuario);
            mostrarAlerta('Usuário atualizado.', 'success');
        } else {
            await window.api.criarUsuario(usuario);
            mostrarAlerta('Usuário criado.', 'success');
        }
        bootstrap.Modal.getInstance(document.getElementById('usuarioModal')).hide();
        await carregarUsuarios();
    } catch (erro) {
        mostrarAlerta(`Erro ao salvar usuário: ${erro.message}`, 'danger');
    }
}
