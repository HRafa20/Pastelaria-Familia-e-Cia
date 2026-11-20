/**
 * perfil.js - Tela "Minha Conta" (Dados do Usuário)
 
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Só deixa entrar quem estiver logado (senão manda para o login)
    exigirLogin();

    // 2. Pega as informações de quem está logado agora e coloca nas caixinhas de texto
    const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
    if (!usuario) return;

    const nomeInput = document.getElementById('perfil-nome');
    const emailInput = document.getElementById('perfil-email');
    const telefoneInput = document.getElementById('perfil-telefone');

    if (nomeInput) nomeInput.value = usuario.nome || '';
    if (emailInput) emailInput.value = usuario.email || '';
    if (telefoneInput) telefoneInput.value = usuario.telefone || '';

    // 3. Quando a pessoa clica no botão "Salvar Alterações":
    const form = document.getElementById('perfilForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Não recarrega a página

            // Atualiza os dados na ficha do usuário:
            usuario.nome = nomeInput.value.trim();
            usuario.email = emailInput.value.trim().toLowerCase();
            usuario.telefone = telefoneInput.value.trim();

            try {
                if (usuario.id && window.api && typeof window.api.atualizarUsuario === 'function') {
                    await window.api.atualizarUsuario(usuario.id, {
                        nome: usuario.nome,
                        email: usuario.email,
                        telefone: usuario.telefone
                    });
                }
            } catch (err) {
                console.warn('Erro ao atualizar usuário no backend:', err);
                mostrarAlerta(`Erro ao salvar no servidor: ${err.message}`, 'warning');
                return;
            }

            // Salva a nova ficha na memória do navegador
            const sessao = obterSessao();
            if (sessao) {
                sessao.usuario = usuario;
                salvarSessao(sessao);
            }

            // Mostra aviso verde de sucesso
            mostrarAlerta('Dados do perfil atualizados com sucesso!', 'success');
        });
    }
});
