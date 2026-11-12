/**
 * api.js
 * Comunicação com a API backend (Spring Boot em http://localhost:8080).
 * Inclui fallback para dados locais de demonstração da Pastelaria Família & Cia
 * caso o backend esteja offline (ex: durante execução com Live Server).
 */

const API_BASE_URL = 'http://localhost:8080';

// Dados iniciais da Pastelaria Família & Cia
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
    { id: '123e4567-e89b-12d3-a456-426614174000', nome: 'Administrador', email: 'admin@familiaecia.com', telefone: '(48) 99999-0000', tipo: 'ADMINISTRADOR' },
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

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const sessao = (typeof obterSessao === 'function') ? obterSessao() : null;
    
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
        if (response.status === 401 && sessao && typeof limparSessao === 'function') {
            limparSessao();
        }
        const mensagem = Array.isArray(data.erros) ? data.erros.join(', ') : (data.mensagem || 'Erro na requisição');
        throw new Error(mensagem);
    }

    return data;
}

function executarMockLocal(endpoint, method, body) {
    // Categorias
    if (endpoint.startsWith('/categorias')) {
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
            const id = endpoint.split('/')[2];
            categorias = categorias.map(c => c.id === id ? { ...c, ...body } : c);
            LocalMock.setCategorias(categorias);
            return { id, ...body };
        }
        if (method === 'DELETE') {
            const id = endpoint.split('/')[2];
            categorias = categorias.filter(c => c.id !== id);
            LocalMock.setCategorias(categorias);
            // Remove também os produtos da categoria (igual ao back-end)
            const restantes = LocalMock.getProdutos().filter(p => (p.idCategoria ?? p.id_categoria) !== id);
            LocalMock.setProdutos(restantes);
            return null;
        }
    }

    // Produtos
    if (endpoint.startsWith('/produtos')) {
        let produtos = LocalMock.getProdutos();
        if (method === 'GET') {
            const idProduto = endpoint.split('?')[0].split('/')[2];
            if (idProduto) {
                return produtos.find(p => p.id === idProduto) || null;
            }
            const queryString = endpoint.includes('?') ? endpoint.split('?')[1] : '';
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
            const id = endpoint.split('/')[2];
            produtos = produtos.map(p => p.id === id ? { ...p, ...body } : p);
            LocalMock.setProdutos(produtos);
            return { id, ...body };
        }
        if (method === 'DELETE') {
            const id = endpoint.split('/')[2];
            produtos = produtos.filter(p => p.id !== id);
            LocalMock.setProdutos(produtos);
            return null;
        }
    }

    // Usuários
    if (endpoint.startsWith('/usuarios')) {
        let usuarios = LocalMock.getUsuarios();
        if (method === 'GET') {
            const idUsuario = endpoint.split('?')[0].split('/')[2];
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
            const id = endpoint.split('/')[2];
            usuarios = usuarios.map(u => u.id === id ? { ...u, ...body } : u);
            LocalMock.setUsuarios(usuarios);
            return { id, ...body };
        }
    }

    // Pedidos
    if (endpoint.startsWith('/pedidos')) {
        let pedidos = LocalMock.getPedidos();
        if (method === 'GET') {
            const partes = endpoint.split('?')[0].split('/');
            if (partes.length >= 3 && partes[2]) {
                const id = partes[2];
                const pedido = pedidos.find(p => p.id === id);
                return pedido || null;
            }
            return { content: pedidos, totalElements: pedidos.length };
        }
        if (method === 'POST') {
            if (endpoint.includes('/cancelar')) {
                const id = endpoint.split('/')[2];
                pedidos = pedidos.map(p => p.id === id ? { ...p, status: 'CANCELADO', motivoCancelamento: body?.motivo } : p);
                LocalMock.setPedidos(pedidos);
                return { id, status: 'CANCELADO' };
            }
            const usuario = (typeof obterUsuarioLogado === 'function' ? obterUsuarioLogado() : null) || { nome: 'Cliente', id: 'user-anon', email: '' };
            const novo = {
                id: 'ped-' + Date.now(),
                idUsuario: usuario.id,
                nomeCliente: usuario.nome,
                emailCliente: usuario.email || '',
                precoTotal: body?.precoTotal || 15.00,
                status: body?.status || 'AGUARDANDO_PAGAMENTO',
                horarioCriacao: new Date().toISOString(),
                ...body
            };
            pedidos.unshift(novo);
            LocalMock.setPedidos(pedidos);
            return novo;
        }
        if (method === 'PUT') {
            const id = endpoint.split('/')[2];
            pedidos = pedidos.map(p => p.id === id ? { ...p, ...body } : p);
            LocalMock.setPedidos(pedidos);
            return { id, ...body };
        }
    }

    if (endpoint.startsWith('/auth/login')) {
        throw new Error('Falha de conexão com o servidor de autenticação.');
    }

    return null;
}

window.api = {
    // Autenticação
    login: (email, senha) => fetchAPI('/auth/login', 'POST', { email, senha }),
    me: () => fetchAPI('/me'),

    // Categorias
    getCategorias: (page = 0, size = 100) => fetchAPI(`/categorias?page=${page}&size=${size}`),
    criarCategoria: (categoria) => fetchAPI('/categorias', 'POST', categoria),
    atualizarCategoria: (id, categoria) => fetchAPI(`/categorias/${id}`, 'PUT', categoria),
    removerCategoria: (id) => fetchAPI(`/categorias/${id}`, 'DELETE'),

    // Produtos
    getProdutos: (page = 0, size = 100, idCategoria = null) =>
        fetchAPI(`/produtos?page=${page}&size=${size}${idCategoria ? `&idCategoria=${idCategoria}` : ''}`),
    getProduto: (id) => fetchAPI(`/produtos/${id}`),
    criarProduto: (produto) => fetchAPI('/produtos', 'POST', produto),
    atualizarProduto: (id, produto) => fetchAPI(`/produtos/${id}`, 'PUT', produto),
    removerProduto: (id) => fetchAPI(`/produtos/${id}`, 'DELETE'),

    // Usuários
    getUsuarios: (page = 0, size = 100) => fetchAPI(`/usuarios?page=${page}&size=${size}`),
    getUsuario: (id) => fetchAPI(`/usuarios/${id}`),
    criarUsuario: (usuario) => fetchAPI('/usuarios', 'POST', usuario),
    atualizarUsuario: (id, usuario) => fetchAPI(`/usuarios/${id}`, 'PUT', usuario),

    // Pedidos
    criarPedido: (pedido) => fetchAPI('/pedidos', 'POST', pedido),
    getPedidos: (page = 0, size = 30) => fetchAPI(`/pedidos?page=${page}&size=${size}`),
    getPedido: (id) => fetchAPI(`/pedidos/${id}`),
    atualizarPedido: (id, dados) => fetchAPI(`/pedidos/${id}`, 'PUT', dados),
    cancelarPedido: (id, motivo) => fetchAPI(`/pedidos/${id}/cancelar`, 'POST', { motivo })
};
