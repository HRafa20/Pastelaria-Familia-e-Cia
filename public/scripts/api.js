/**
 * api.js - O "Garçom e Mensageiro" do Sistema (Comunicação com o Servidor)
 
 */

// Endereço onde o servidor da pastelaria estaria rodando
const API_BASE_URL = 'https://pastelaria-back.onrender.com';

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
        status: 'EM_PREPARO',
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
    const emailAdmin = sessao?.usuario?.email;
    
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(sessao?.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
            ...(emailAdmin ? { 'X-Admin-Email': emailAdmin } : {})
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
        if (response.status === 401 && sessao && typeof limparSessao === 'function' && !endpoint.includes('/login')) {
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
        } else if (data.erro) {
            mensagem = data.erro;
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
            categorias = categorias.filter(c => String(c.id) !== String(id));
            LocalMock.setCategorias(categorias);
            // Remove também os produtos da categoria (igual ao back-end)
            const restantes = LocalMock.getProdutos().filter(p => String(p.idCategoria ?? p.id_categoria ?? '') !== String(id));
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
    getCategorias: async (page = 0, size = 100) => {
        const resp = await fetchAPI('/api/categorias');
        const lista = Array.isArray(resp) ? resp : (resp?.content || []);
        lista.content = lista;
        return lista;
    },
    criarCategoria: (categoria) => fetchAPI('/api/categorias', 'POST', { nome: categoria.nome }),
    atualizarCategoria: (id, categoria) => fetchAPI(`/api/categorias/${id}`, 'PUT', categoria),
    removerCategoria: (id) => fetchAPI(`/api/categorias/${id}`, 'DELETE'),

    // Produtos
    getProdutos: async (page = 0, size = 100, idCategoria = null) => {
        const query = idCategoria ? `?categoria=${encodeURIComponent(idCategoria)}` : '';
        const resp = await fetchAPI(`/api/produtos${query}`);
        const lista = Array.isArray(resp) ? resp : (resp?.content || []);
        lista.forEach(p => {
            p.imagem = p.imagem || p.imagemUrl || '';
            p.imagemUrl = p.imagemUrl || p.imagem || '';
            p.idCategoria = p.idCategoria || p.categoria || '';
        });
        lista.content = lista;
        return lista;
    },
    getProduto: async (id) => {
        const p = await fetchAPI(`/api/produtos/${id}`);
        if (p) {
            p.imagem = p.imagem || p.imagemUrl || '';
            p.imagemUrl = p.imagemUrl || p.imagem || '';
            p.idCategoria = p.idCategoria || p.categoria || '';
        }
        return p;
    },
    criarProduto: (produto) => {
        const payload = {
            nome: produto.nome,
            descricao: produto.descricao || '',
            preco: Number(produto.preco),
            categoria: produto.categoria || produto.idCategoria || 'Geral',
            imagemUrl: produto.imagemUrl || produto.imagem || null,
            disponivel: produto.disponivel !== false
        };
        return fetchAPI('/api/produtos', 'POST', payload);
    },
    atualizarProduto: (id, produto) => {
        const payload = {
            nome: produto.nome,
            descricao: produto.descricao || '',
            preco: Number(produto.preco),
            categoria: produto.categoria || produto.idCategoria || 'Geral',
            imagemUrl: produto.imagemUrl || produto.imagem || null,
            disponivel: produto.disponivel !== false
        };
        return fetchAPI(`/api/produtos/${id}`, 'PUT', payload);
    },
    removerProduto: (id) => fetchAPI(`/api/produtos/${id}`, 'DELETE'),

    // Usuários
    getUsuarios: async (page = 0, size = 100) => {
        const resp = await fetchAPI('/api/usuarios');
        const lista = Array.isArray(resp) ? resp : (resp?.content || []);
        lista.forEach(u => {
            u.tipo = (u.tipo || 'CLIENTE').toUpperCase();
        });
        lista.content = lista;
        return lista;
    },
    getUsuario: (id) => fetchAPI(`/api/usuarios/${id}`),
    criarUsuario: (usuario) => fetchAPI('/api/usuarios', 'POST', usuario),
    atualizarUsuario: (id, usuario) => fetchAPI(`/api/usuarios/${id}`, 'PUT', usuario),

    // Pedidos
    criarPedido: (pedido) => {
        const usuarioLogado = (typeof obterUsuarioLogado === 'function' ? obterUsuarioLogado() : null);
        const payload = {
            usuarioId: pedido.usuarioId || pedido.idUsuario || usuarioLogado?.id || null,
            nomeCliente: pedido.nomeCliente || usuarioLogado?.nome || '',
            emailCliente: pedido.emailCliente || usuarioLogado?.email || '',
            tipoEntrega: pedido.tipoEntrega || 'RETIRADA',
            endereco: pedido.endereco || (pedido.tipoEntrega === 'DELIVERY' ? '' : 'Retirada no balcão'),
            telefone: pedido.telefone || usuarioLogado?.telefone || '',
            formaPagamento: pedido.formaPagamento || 'PIX',
            itens: (pedido.itens || []).map(i => ({
                idProduto: String(i.idProduto || i.id),
                quantidade: Number(i.quantidade) || 1
            }))
        };
        return fetchAPI('/api/pedidos', 'POST', payload);
    },
    getPedidos: async (page = 0, size = 30) => {
        const resp = await fetchAPI('/api/pedidos');
        const lista = Array.isArray(resp) ? resp : (resp?.content || []);

        // Busca usuários cadastrados para cruzar usuarioId com o Nome do Cliente
        const mapaUsuarios = new Map();
        try {
            const usuariosResp = await fetchAPI('/api/usuarios');
            const listaUsuarios = Array.isArray(usuariosResp) ? usuariosResp : (usuariosResp?.content || []);
            listaUsuarios.forEach(u => {
                if (u && u.id) mapaUsuarios.set(String(u.id), u);
            });
        } catch (e) {
            // Se falhar ao buscar usuários da API, prossegue
        }

        // Complementa o mapa com usuários de contingência local (fc_usuarios_cadastrados e fc_usuarios_admin)
        try {
            const usersCadastrados = JSON.parse(localStorage.getItem('fc_usuarios_cadastrados') || '[]');
            usersCadastrados.forEach(u => {
                if (u && u.id && !mapaUsuarios.has(String(u.id))) mapaUsuarios.set(String(u.id), u);
            });
            const usersAdmin = JSON.parse(localStorage.getItem('fc_usuarios_admin') || '[]');
            usersAdmin.forEach(u => {
                if (u && u.id && !mapaUsuarios.has(String(u.id))) mapaUsuarios.set(String(u.id), u);
            });
        } catch (e) {}

        const usuarioLogado = (typeof obterUsuarioLogado === 'function') ? obterUsuarioLogado() : null;

        lista.forEach(p => {
            p.precoTotal = p.precoTotal ?? p.valorTotal ?? 0;
            p.valorTotal = p.valorTotal ?? p.precoTotal ?? 0;
            p.idUsuario = p.idUsuario ?? p.usuarioId ?? '';
            p.usuarioId = p.usuarioId ?? p.idUsuario ?? '';
            p.horarioCriacao = p.horarioCriacao ?? p.criadoEm ?? new Date().toISOString();
            p.criadoEm = p.criadoEm ?? p.horarioCriacao;
            p.endereco = p.endereco ?? p.enderecoEntrega ?? '';
            p.enderecoEntrega = p.enderecoEntrega ?? p.endereco ?? '';
            p.status = (p.status || 'CRIADO').toUpperCase();

            // Vincula o nome e dados reais do cliente
            const u = mapaUsuarios.get(String(p.usuarioId || p.idUsuario));
            if (u) {
                p.nomeCliente = p.nomeCliente || u.nome;
                p.emailCliente = p.emailCliente || u.email;
                if (!p.telefone || p.telefone === '0') p.telefone = u.telefone;
            } else if (!p.nomeCliente && usuarioLogado && (
                String(usuarioLogado.id) === String(p.usuarioId || p.idUsuario) ||
                (usuarioLogado.email && p.emailCliente && String(usuarioLogado.email).toLowerCase() === String(p.emailCliente).toLowerCase())
            )) {
                p.nomeCliente = usuarioLogado.nome;
                p.emailCliente = usuarioLogado.email;
            } else if (!p.nomeCliente && usuarioLogado && !ehAdministrador()) {
                // Se for o cliente logado vendo seus próprios pedidos filtrados
                p.nomeCliente = usuarioLogado.nome;
                p.emailCliente = p.emailCliente || usuarioLogado.email;
            }
        });
        lista.content = lista;
        return lista;
    },
    getPedido: async (id) => {
        const p = await fetchAPI(`/api/pedidos/${id}`);
        if (p) {
            p.precoTotal = p.precoTotal ?? p.valorTotal ?? 0;
            p.valorTotal = p.valorTotal ?? p.precoTotal ?? 0;
            p.idUsuario = p.idUsuario ?? p.usuarioId ?? '';
            p.usuarioId = p.usuarioId ?? p.idUsuario ?? '';
            p.horarioCriacao = p.horarioCriacao ?? p.criadoEm ?? new Date().toISOString();
            p.criadoEm = p.criadoEm ?? p.horarioCriacao;
            p.endereco = p.endereco ?? p.enderecoEntrega ?? '';
            p.enderecoEntrega = p.enderecoEntrega ?? p.endereco ?? '';
            p.status = (p.status || 'CRIADO').toUpperCase();

            // Busca os dados do cliente se ainda não tiver nomeCliente
            if (!p.nomeCliente && p.usuarioId) {
                try {
                    const u = await fetchAPI(`/api/usuarios/${p.usuarioId}`);
                    if (u) {
                        p.nomeCliente = u.nome;
                        p.emailCliente = u.email;
                        if (!p.telefone || p.telefone === '0') p.telefone = u.telefone;
                    }
                } catch (e) {}
            }

            if (!p.itens || p.itens.length === 0) {
                try {
                    const itens = await fetchAPI(`/api/itens-pedido/pedido/${id}`);
                    if (Array.isArray(itens)) {
                        p.itens = itens.map(i => ({
                            idProduto: i.produtoId || i.idProduto,
                            nome: i.descricao || 'Pastel',
                            quantidade: i.quantidade || 1,
                            precoUnitario: i.precoUnitario || 0,
                            subtotal: (Number(i.precoUnitario) || 0) * (Number(i.quantidade) || 1)
                        }));
                    }
                } catch (e) {
                    p.itens = p.itens || [];
                }
            }
        }
        return p;
    },
    atualizarPedido: (id, dados) => fetchAPI(`/api/pedidos/${id}`, 'PUT', dados),
    cancelarPedido: (id, motivo) => fetchAPI(`/api/pedidos/${id}/cancelar`, 'POST', { motivo })
};
