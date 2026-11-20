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
                nome,
                email,
                senha,
                telefone,
                tipo: 'cliente' // Todo mundo que se cadastra por aqui é Cliente
            };

            // 2. Envia para o servidor oficial da pastelaria (MySQL / Spring Boot)
            let usuarioCriado = null;
            try {
                if (window.api && typeof window.api.criarUsuario === 'function') {
                    usuarioCriado = await window.api.criarUsuario(usuario);
                }
            } catch (err) {
                console.warn('Erro ao cadastrar no backend:', err);
                mostrarAlerta(`Não foi possível realizar o cadastro: ${err.message}`, 'danger');
                return;
            }

            const userSalvo = usuarioCriado || { ...usuario, id: 'user-' + Date.now() };

            // 3. Salva também na memória do navegador para contingência
            const cadastrados = JSON.parse(localStorage.getItem('fc_usuarios_cadastrados') || '[]');
            if (!cadastrados.some(u => u.email.toLowerCase() === email)) {
                cadastrados.push(userSalvo);
                localStorage.setItem('fc_usuarios_cadastrados', JSON.stringify(cadastrados));
            }

            // 4. Cria o crachá de acesso na hora com o ID real do banco (já entra logado automaticamente):
            salvarSessao({
                token: 'token-' + userSalvo.id,
                usuario: {
                    id: userSalvo.id,
                    nome: userSalvo.nome,
                    email: userSalvo.email,
                    telefone: userSalvo.telefone,
                    tipo: (userSalvo.tipo || 'CLIENTE').toUpperCase()
                }
            });

            // 5. Manda o novo cliente direto para escolher os pastéis!
            window.location.href = 'index.html';
        });
    }
});
