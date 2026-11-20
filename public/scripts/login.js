/**
 * login.js - Tela de Entrada (Login)
 
 */

// Usuários já prontos para testar sem precisar ligar o banco de dados:
const USUARIOS_TESTE = [
    {
        // Dono da pastelaria (acesso total às telas administrativas)
        email: 'admin@familiaecia.com',
        senha: 'admin123',
        usuario: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            nome: 'Administrador',
            email: 'admin@familiaecia.com',
            telefone: '(48) 99999-0000',
            tipo: 'ADMINISTRADOR'
        }
    },
    {
        // Compatibilidade alternativa
        email: 'admin@nonna.com',
        senha: 'admin123',
        usuario: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            nome: 'Administrador',
            email: 'admin@nonna.com',
            telefone: '(48) 99999-0000',
            tipo: 'ADMINISTRADOR'
        }
    },
    {
        // Cliente comum (só faz pedidos e acompanha o seu próprio pastel)
        email: 'joao@example.com',
        senha: 'senha123',
        usuario: {
            id: '223e4567-e89b-12d3-a456-426614174001',
            nome: 'João Silva',
            email: 'joao@example.com',
            telefone: '(48) 98888-7777',
            tipo: 'CLIENTE'
        }
    }
];

// Quando a tela carregar, fica esperando a pessoa clicar no botão "Entrar"
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', fazerLogin);
    }
});

// Função que faz a verificação do e-mail e senha
async function fazerLogin(evento) {
    evento.preventDefault(); // Impede a página de recarregar sozinha

    // 1. Lê o que foi digitado nos campos de e-mail e senha:
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;

    // 2. Primeiro tenta perguntar para o servidor Java/Spring Boot (se estiver ligado):
    try {
        if (window.api && typeof window.api.login === 'function') {
            const resposta = await window.api.login(email, senha);
            if (resposta && resposta.token) {
                salvarSessao(resposta);             // Guarda o crachá de acesso
                window.location.href = 'index.html'; // Entra no site
                return;
            }
        }
    } catch (erro) {
        console.warn('API indisponível, usando credenciais de teste locais:', erro.message);
        if (!erro.message.includes('Failed to fetch') && !erro.message.includes('NetworkError') && !erro.message.includes('servidor')) {
            mostrarAlerta(erro.message, 'danger');
            return;
        }
    }

    // 3. Se o servidor estiver desligado (ex: durante apresentação rápida), confere nos usuários de teste:
    const usuarioTeste = USUARIOS_TESTE.find(
        (u) => u.email.toLowerCase() === email && u.senha === senha
    );

    if (usuarioTeste) {
        // Encontrou! Cria a sessão local e entra
        const sessaoLocal = {
            token: 'demo-jwt-token-' + Date.now(),
            usuario: usuarioTeste.usuario
        };
        salvarSessao(sessaoLocal);
        window.location.href = 'index.html';
        return;
    }

    // 4. Também confere se foi um cliente que se cadastrou agora pouco pelo formulário:
    const usuariosLocais = JSON.parse(localStorage.getItem('fc_usuarios_cadastrados') || '[]');
    const usuarioCadastrado = usuariosLocais.find(
        (u) => u.email.toLowerCase() === email && u.senha === senha
    );

    if (usuarioCadastrado) {
        const sessaoLocal = {
            token: 'demo-jwt-token-' + Date.now(),
            usuario: usuarioCadastrado
        };
        salvarSessao(sessaoLocal);
        window.location.href = 'index.html';
        return;
    }

    // 5. Se não bateu nenhum e-mail e senha, mostra aviso vermelho de erro:
    mostrarAlerta('E-mail ou senha incorretos.', 'danger');
}
