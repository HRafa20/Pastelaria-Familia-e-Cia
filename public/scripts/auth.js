/**
 * auth.js - Cadastro de Novos Clientes (Criar Conta)

 */

document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registroForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Não recarrega a página ao enviar

            // 1. Pega tudo o que o cliente digitou nos campos:
            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const senha = document.getElementById('senha').value;
            const telefone = document.getElementById('telefone').value.trim();

            // Monta a ficha do novo cliente
            const usuario = {
                id: 'user-' + Date.now(),
                nome,
                email,
                senha,
                telefone,
                tipo: 'CLIENTE' // Todo mundo que se cadastra por aqui é Cliente
            };

            // 2. Tenta enviar para o servidor oficial da pastelaria (se estiver ligado)
            try {
                if (window.api && typeof window.api.criarUsuario === 'function') {
                    await window.api.criarUsuario(usuario);
                }
            } catch (err) {
                console.warn('Backend indisponível para registro, gravando localmente:', err);
            }

            // 3. Salva também na memória do celular para que ele consiga fazer login mesmo sem internet
            const cadastrados = JSON.parse(localStorage.getItem('fc_usuarios_cadastrados') || '[]');
            // Se já existir alguém com esse mesmo e-mail, avisa e não deixa cadastrar duplicado:
            if (cadastrados.some(u => u.email.toLowerCase() === email)) {
                mostrarAlerta('Este e-mail já está cadastrado.', 'warning');
                return;
            }

            cadastrados.push(usuario);
            localStorage.setItem('fc_usuarios_cadastrados', JSON.stringify(cadastrados));

            // 4. Cria o crachá de acesso na hora (já entra logado automaticamente):
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

            // 5. Manda o novo cliente direto para escolher os pastéis!
            window.location.href = 'index.html';
        });
    }
});
