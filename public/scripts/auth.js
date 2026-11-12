/**
 * auth.js
 * Gerenciamento de cadastro de clientes.
 */

document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registroForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const senha = document.getElementById('senha').value;
            const telefone = document.getElementById('telefone').value.trim();

            const usuario = {
                id: 'user-' + Date.now(),
                nome,
                email,
                senha,
                telefone,
                tipo: 'CLIENTE'
            };

            // Tenta salvar via API se disponível
            try {
                if (window.api && typeof window.api.criarUsuario === 'function') {
                    await window.api.criarUsuario(usuario);
                }
            } catch (err) {
                console.warn('Backend indisponível para registro, gravando localmente:', err);
            }

            // Salva no banco de usuários locais para que o login funcione
            const cadastrados = JSON.parse(localStorage.getItem('fc_usuarios_cadastrados') || '[]');
            if (cadastrados.some(u => u.email.toLowerCase() === email)) {
                mostrarAlerta('Este e-mail já está cadastrado.', 'warning');
                return;
            }

            cadastrados.push(usuario);
            localStorage.setItem('fc_usuarios_cadastrados', JSON.stringify(cadastrados));

            // Salva a sessão do novo usuário e redireciona
            salvarSessao({
                token: 'demo-jwt-user-' + Date.now(),
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    telefone: usuario.telefone,
                    tipo: usuario.tipo
                }
            });

            window.location.href = 'index.html';
        });
    }
});
