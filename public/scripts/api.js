/**
 * api.js - O "Garçom e Mensageiro" do Sistema (Comunicação com o Servidor)
 
 */

// Endereço onde o servidor da pastelaria estaria rodando
const API_BASE_URL = 'http://localhost:8080';

// Dados iniciais de teste (pastéis, categorias e clientes de exemplo para a apresentação já começar pronta):
const SEED_CATEGORIAS = [
    { id: 'cat-pasteis', nome: 'Pastéis Salgados' },
    { id: 'cat-doces', nome: 'Pastéis Doces' },
    { id: 'cat-bebidas', nome: 'Bebidas' }
];

const SEED_PRODUTOS = [
    { id: 'prod-1', nome: 'Pastel de Carne', descricao: 'Carne moída temperada com receita especial e massa crocante.', preco: 12.00, idCategoria: 'cat-pasteis', imagem: 'public/images/pasteldecarne.webp' },
    { id: 'prod-2', nome: 'Pastel de Queijo', descricao: 'Mussarela derretida e massa crocante dourada.', preco: 12.00, idCategoria: 'cat-pasteis', imagem: 'public/images/pasteldequeijo.jpg' },
    { id: 'prod-3', nome: 'Pastel de Frango com Catupiry', descricao: 'Frango desfiado com Catupiry original cremoso.', preco: 15.00, idCategoria: 'cat-pasteis', imagem: 'public/images/pasteldefrangocomcatupiry.jpg' },
    { id: 'prod-4', nome: 'Pastel de Frango', descricao: 'Frango desfiado suculento com tempero especial.', preco: 14.00, idCategoria: 'cat-pasteis', imagem: 'public/images/pasteldefrango.jpg' },
    { id: 'prod-5', nome: 'Pastel de Chocolate', descricao: 'Recheio generoso de chocolate ao leite.', preco: 14.00, idCategoria: 'cat-doces', imagem: 'public/images/pasteldechocolate.jpg' }
];

const SEED_USUARIOS = [
    { id: '9fd3d5bd-80e8-4c40-a7a5-1d1c116ee0f9', nome: 'Administrador', email: 'admin@familiaecia.com', telefone: '(48) 99999-0000', tipo: 'ADMINISTRADOR' },
    { id: '223e4567-e89b-12d3-a456-426614174001', nome: 'João Silva', email: 'joao@example.com', telefone: '(48) 98888-7777', tipo: 'CLIENTE' }
];

const SEED_PEDIDOS = [
    {
        id: 'ped-1',
        idUsuario: '223e4567-e89b-12d3-a456-426614174001',
        nomeCliente: 'João Silva',
        emailCliente: 'joao@example.com',
        telefone: '(48) 98888-7777',
        tipoEntrega: 'DELIVERY',
        endereco: 'Rua das Flores, 123',
        formaPagamento: 'PIX',
        taxaEntrega: 5.00,
        precoTotal: 27.00,
        status: 'EM_ANDAMENTO',
        horarioCriacao: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        itens: [
            { idProduto: 'prod-1', nome: 'Pastel de Carne', quantidade: 1, precoUnitario: 12.00, subtotal: 12.00 },
            { idProduto: 'prod-3', nome: 'Pastel de Frango com Catupiry', quantidade: 1, precoUnitario: 15.00, subtotal: 15.00 }
        ]
    }
];

// O "Banco de Dados de Emergência": guarda e busca tudo dentro do navegador do cliente
const LocalMock = {
    getCategorias: () => JSON.parse(localStorage.getItem('fc_categorias')) || SEED_CATEGORIAS,
    setCategorias: (c) => localStorage.setItem('fc_categorias', JSON.stringify(c)),
    getProdutos: () => JSON.parse(localStorage.getItem('fc_produtos')) || SEED_PRODUTOS,
    setProdutos: (p) => localStorage.setItem('fc_produtos', JSON.stringify(p)),
    getUsuarios: () => JSON.parse(localStorage.getItem('fc_usuarios_admin')) || SEED_USUARIOS,
    setUsuarios: (u) => localStorage.setItem('fc_usuarios_admin', JSON.stringify(u)),
    getPedidos: () => JSON.parse(localStorage.getItem('fc_pedidos')) || SEED_PEDIDOS,
    setPedidos: (p) => localStorage.setItem('fc_pedidos', JSON.stringify(p))
};

// Função que envia a mensagem: tenta o servidor real, e se der erro, usa o banco de dados do navegador
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const sessao = (typeof obterSessao === 'function') ? obterSessao() : null;
    const ehSessaoDemo = !!(sessao?.token && sessao.token.startsWith('demo-'));

    // Se estiver usando sessão de demonstração/offline, utiliza o mock local diretamente
    // evitando falhas de autenticação (401/403) no backend real para tokens simulados
    if (ehSessaoDemo) {
        console.log(`[Modo Demonstração] Usando dados locais para ${endpoint}`);
        return executarMockLocal(endpoint, method, body);
    }
    
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {})
        },
    };
    if (body !== null) config.body = JSON.stringify(body);

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (erro) {
        // Fallback local se o servidor de backend estiver indisponível
        // (qualquer falha de rede, em qualquer navegador)
        console.warn(`[Modo Offline/Demonstração] Backend indisponível (${endpoint}). Carregando dados locais.`);
        return executarMockLocal(endpoint, method, body);
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error('[fetchAPI] Resposta com erro:', response.status, data);
        if (response.status === 401 && sessao && typeof limparSessao === 'function') {
            limparSessao();
        }
        let mensagem = '';
        if (Array.isArray(data.erros) && data.erros.length > 0) {
            mensagem = data.erros.join(', ');
        } else if (Array.isArray(data.errors) && data.errors.length > 0) {
            mensagem = data.errors.map(e => e.defaultMessage || e.message || JSON.stringify(e)).join(', ');
        } else if (data.mensagem) {
            mensagem = data.mensagem;
        } else if (data.message) {
            mensagem = data.message;
        } else if (data.error && typeof data.error === 'string') {
            mensagem = data.error;
        } else {
            mensagem = `Erro HTTP ${response.status} na requisição`;
        }
        throw new Error(mensagem);
    }

    return data;
}

// Emula endpoints REST (GET/POST/PUT/DELETE) direto no navegador para modo demonstração
function executarMockLocal(endpoint, method, body) {
    // Normaliza endpoint para remover '/api' caso venha com esse prefixo
    const path = endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;

    // Categorias
    if (path.startsWith('/categorias')) {
        let categorias = LocalMock.getCategorias();
        if (method === 'GET') {
            return { content: categorias, totalElements: categorias.length };
        }
        if (method === 'POST') {
            const nova = { id: 'cat-' + Date.now(), nome: body.nome };
            categorias.push(nova);
            LocalMock.setCategorias(categorias);
            return nova;
        }
        if (method === 'PUT') {
            const id = path.split('/')[2];
            categorias = categorias.map(c => c.id === id ? { ...c, ...body } : c);
            LocalMock.setCategorias(categorias);
            return { id, ...body };
        }
        if (method === 'DELETE') {
            const id = path.split('/')[2];
            categorias = categorias.filter(c => c.id !== id);
            LocalMock.setCategorias(categorias);
            // Remove também os produtos da categoria (igual ao back-end)
            const restantes = LocalMock.getProdutos().filter(p => (p.idCategoria ?? p.id_categoria) !== id);
            LocalMock.setProdutos(restantes);
            return null;
        }
    }

    // Produtos
    if (path.startsWith('/produtos')) {
        let produtos = LocalMock.getProdutos();
        if (method === 'GET') {
            const idProduto = path.split('?')[0].split('/')[2];
            if (idProduto) {
                return produtos.find(p => p.id === idProduto) || null;
            }
            const queryString = path.includes('?') ? path.split('?')[1] : '';
            const urlParams = new URLSearchParams(queryString);
            const idCat = urlParams.get('idCategoria');
            let filtrados = produtos;
            if (idCat) {
                filtrados = produtos.filter(p => String(p.idCategoria ?? p.id_categoria ?? '') === idCat);
            }
            return { content: filtrados, totalElements: filtrados.length };
        }
        if (method === 'POST') {
            const novo = { id: 'prod-' + Date.now(), ...body };
            produtos.push(novo);
            LocalMock.setProdutos(produtos);
            return novo;
        }
        if (method === 'PUT') {
            const id = path.split('/')[2];
            produtos = produtos.map(p => p.id === id ? { ...p, ...body } : p);
            LocalMock.setProdutos(produtos);
            return { id, ...body };
        }
        if (method === 'DELETE') {
            const id = path.split('/')[2];
            produtos = produtos.filter(p => p.id !== id);
            LocalMock.setProdutos(produtos);
            return null;
        }
    }

    // Usuários
    if (path.startsWith('/usuarios')) {
        let usuarios = LocalMock.getUsuarios();
        if (method === 'GET') {
            const idUsuario = path.split('?')[0].split('/')[2];
            if (idUsuario) {
                return usuarios.find(u => u.id === idUsuario) || null;
            }
            return { content: usuarios, totalElements: usuarios.length };
        }
        if (method === 'POST') {
            const novo = { id: 'user-' + Date.now(), ...body };
            usuarios.push(novo);
            LocalMock.setUsuarios(usuarios);
            return novo;
        }
        if (method === 'PUT') {
            const id = path.split('/')[2];
            usuarios = usuarios.map(u => u.id === id ? { ...u, ...body } : u);
            LocalMock.setUsuarios(usuarios);
            return { id, ...body };
        }
    }

    // Pedidos
    if (path.startsWith('/pedidos')) {
        let pedidos = LocalMock.getPedidos();
        if (method === 'GET') {
            const partes = path.split('?')[0].split('/');
            if (partes.length >= 3 && partes[2]) {
                const id = partes[2];
                const pedido = pedidos.find(p => p.id === id);
                return pedido || null;
            }
            return { content: pedidos, totalElements: pedidos.length };
        }
        if (method === 'POST') {
            if (path.includes('/cancelar')) {
                const id = path.split('/')[2];
                pedidos = pedidos.map(p => p.id === id ? { ...p, status: 'CANCELADO', motivoCancelamento: body?.motivo } : p);
                LocalMock.setPedidos(pedidos);
                return { id, status: 'CANCELADO' };
            }
            const usuario = (typeof obterUsuarioLogado === 'function' ? obterUsuarioLogado() : null) || { nome: 'Cliente', id: 'user-anon', email: '' };
            
            // Garante itens completos com nome, preço e subtotal
            const produtos = LocalMock.getProdutos();
            const itensEnriquecidos = (body?.itens || []).map(item => {
                const prod = produtos.find(p => String(p.id) === String(item.idProduto));
                const preco = Number(item.precoUnitario || prod?.preco || 12.00);
                const nome = item.nome || prod?.nome || 'Pastel';
                const qtd = Number(item.quantidade) || 1;
                return {
                    idProduto: item.idProduto,
                    nome,
                    quantidade: qtd,
                    precoUnitario: preco,
                    subtotal: Number(item.subtotal || (preco * qtd))
                };
            });
            const totalCalculado = itensEnriquecidos.reduce((acc, i) => acc + i.subtotal, 0);

            const novo = {
                id: 'ped-' + Date.now(),
                idUsuario: usuario.id,
                nomeCliente: usuario.nome,
                emailCliente: usuario.email || '',
                tipoEntrega: body?.tipoEntrega || 'RETIRADA',
                endereco: body?.endereco || null,
                formaPagamento: body?.formaPagamento || 'PIX',
                telefone: body?.telefone || usuario.telefone || '',
                taxaEntrega: body?.tipoEntrega === 'DELIVERY' ? 5.00 : 0.00,
                precoTotal: Number(body?.precoTotal || totalCalculado),
                status: 'CRIADO',
                horarioCriacao: new Date().toISOString(),
                ...body,
                itens: itensEnriquecidos
            };
            pedidos.unshift(novo);
            LocalMock.setPedidos(pedidos);
            return novo;
        }
        if (method === 'PUT') {
            const id = path.split('/')[2];
            pedidos = pedidos.map(p => p.id === id ? { ...p, ...body } : p);
            LocalMock.setPedidos(pedidos);
            return { id, ...body };
        }
    }

    if (path.startsWith('/auth/login') || path.startsWith('/usuarios/login')) {
        throw new Error('Falha de conexão com o servidor de autenticação.');
    }

    return null;
}

// Objeto global de API: métodos que as telas chamam diretamente (Design Pattern: Facade)
window.api = {
    // Autenticação
    login: (email, senha) => fetchAPI('/api/usuarios/login', 'POST', { email, senha }),
    me: () => fetchAPI('/me'),

    // Categorias
    getCategorias: (page = 0, size = 100) => fetchAPI(`/api/categorias?page=${page}&size=${size}`),
    criarCategoria: (categoria) => fetchAPI('/api/categorias', 'POST', categoria),
    atualizarCategoria: (id, categoria) => fetchAPI(`/api/categorias/${id}`, 'PUT', categoria),
    removerCategoria: (id) => fetchAPI(`/api/categorias/${id}`, 'DELETE'),

    // Produtos
    getProdutos: (page = 0, size = 100, idCategoria = null) =>
        fetchAPI(`/api/produtos?page=${page}&size=${size}${idCategoria ? `&idCategoria=${idCategoria}` : ''}`),
    getProduto: (id) => fetchAPI(`/api/produtos/${id}`),
    criarProduto: (produto) => fetchAPI('/api/produtos', 'POST', produto),
    atualizarProduto: (id, produto) => fetchAPI(`/api/produtos/${id}`, 'PUT', produto),
    removerProduto: (id) => fetchAPI(`/api/produtos/${id}`, 'DELETE'),

    // Usuários
    getUsuarios: (page = 0, size = 100) => fetchAPI(`/api/usuarios?page=${page}&size=${size}`),
    getUsuario: (id) => fetchAPI(`/api/usuarios/${id}`),
    criarUsuario: (usuario) => fetchAPI('/api/usuarios', 'POST', usuario),
    atualizarUsuario: (id, usuario) => fetchAPI(`/api/usuarios/${id}`, 'PUT', usuario),

    // Pedidos
    criarPedido: (pedido) => fetchAPI('/api/pedidos', 'POST', pedido),
    getPedidos: (page = 0, size = 30) => fetchAPI(`/api/pedidos?page=${page}&size=${size}`),
    getPedido: (id) => fetchAPI(`/api/pedidos/${id}`),
    atualizarPedido: (id, dados) => fetchAPI(`/api/pedidos/${id}`, 'PUT', dados),
    cancelarPedido: (id, motivo) => fetchAPI(`/api/pedidos/${id}/cancelar`, 'POST', { motivo })
};
