/**
 * login.js
 * Gerenciamento de autenticação e sessão.
 * 
 * ============================================================================
 * COMO ALTERAR O E-MAIL E A SENHA DE TESTE:
 * Você pode editar diretamente a lista USUARIOS_TESTE abaixo.
 * ============================================================================
 */

// CREDENCIAIS DE TESTE:
const USUARIOS_TESTE = [
    {
        // Administrador padrão da Pastelaria
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
        // Compatibilidade alternativa com o email anterior
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
        // Usuário cliente para testes
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', fazerLogin);
    }
});

async function fazerLogin(evento) {
    evento.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;

    // 1. Tentar autenticação via API backend primeiro (se o backend estiver rodando)
    try {
        if (window.api && typeof window.api.login === 'function') {
            const resposta = await window.api.login(email, senha);
            if (resposta && resposta.token) {
                salvarSessao(resposta);
                window.location.href = 'index.html';
                return;
            }
        }
    } catch (erro) {
        console.warn('API indisponível ou retorno inesperado, verificando credenciais locais:', erro.message);
        // Se a API retornou erro de credenciais inválidas vindo do backend ativo:
        if (!erro.message.includes('Failed to fetch') && !erro.message.includes('NetworkError') && !erro.message.includes('servidor')) {
            mostrarAlerta(erro.message, 'danger');
            return;
        }
    }

    // 2. Fallback de teste local: permite acessar mesmo com backend offline no Live Server
    const usuarioTeste = USUARIOS_TESTE.find(
        (u) => u.email.toLowerCase() === email && u.senha === senha
    );

    if (usuarioTeste) {
        const sessaoLocal = {
            token: 'demo-jwt-token-' + Date.now(),
            usuario: usuarioTeste.usuario
        };
        salvarSessao(sessaoLocal);
        window.location.href = 'index.html';
        return;
    }

    // Também verifica se foi cadastrado novo usuário pelo registro local
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

    mostrarAlerta('E-mail ou senha incorretos.', 'danger');
}
