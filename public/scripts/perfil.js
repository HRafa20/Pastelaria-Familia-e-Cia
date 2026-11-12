/**
 * perfil.js
 * Visualização e edição do perfil do usuário logado.
 */

document.addEventListener('DOMContentLoaded', () => {
    exigirLogin();

    const usuario = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;
    if (!usuario) return;

    const nomeInput = document.getElementById('perfil-nome');
    const emailInput = document.getElementById('perfil-email');
    const telefoneInput = document.getElementById('perfil-telefone');

    if (nomeInput) nomeInput.value = usuario.nome || '';
    if (emailInput) emailInput.value = usuario.email || '';
    if (telefoneInput) telefoneInput.value = usuario.telefone || '';

    const form = document.getElementById('perfilForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            usuario.nome = nomeInput.value.trim();
            usuario.email = emailInput.value.trim().toLowerCase();
            usuario.telefone = telefoneInput.value.trim();

            const sessao = obterSessao();
            if (sessao) {
                sessao.usuario = usuario;
                salvarSessao(sessao);
            }

            mostrarAlerta('Dados do perfil atualizados com sucesso!', 'success');
        });
    }
});
