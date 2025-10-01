const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- Configurações Iniciais ---
// Permite requisições de origens diferentes (CORS) - ESSENCIAL
app.use(cors()); 
app.use(express.json());

// --- Variáveis de Ambiente ---
const MONGODB_URI = process.env.MONGODB_URI; 
const PORT = process.env.PORT || 3000; 

// Conexão com o banco de dados MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch(err => console.error('Erro de conexão com o MongoDB:', err));

// --- Schemas (Modelo de Dados Memory) ---

const memorySchema = new mongoose.Schema({
    agente: String,
    dataHora: { type: Date, default: Date.now },
    texto: String, // Contém Título e Conteúdo para busca
    estado: String, 
    imagemUrl: String
});

// CRIAÇÃO DO ÍNDICE DE TEXTO: Fundamental para o chatbot buscar palavras-chave rapidamente
memorySchema.index({ texto: 'text' }); 

const Memory = mongoose.model('Memory', memorySchema); 

// --- Rotas da API ---

// Rota de Teste (Raiz)
app.get('/', (req, res) => {
    res.send('Servidor Base de Conhecimento API está ativo!');
});

// -----------------------------------------------------------
// ROTA: Salvar Conteúdo na Base de Conhecimento (Gerenciamento)
// Rota: POST /api/memories
// -----------------------------------------------------------
app.post('/api/memories', async (req, res) => {
    try {
        const novaMemoria = new Memory(req.body);
        await novaMemoria.save();
        res.status(201).send(novaMemoria);
    } catch (error) {
        // Envia erros detalhados para o frontend gerenciar
        res.status(400).json({ 
            message: 'Erro ao salvar conteúdo.', 
            error: error.message 
        });
    }
});

// ROTA: Listar todas as Memórias (Para futuras telas de listagem/edição)
// Rota: GET /api/memories
app.get('/api/memories', async (req, res) => {
    try {
        const memories = await Memory.find({}).sort({ dataHora: -1 });
        res.send(memories);
    } catch (error) {
        res.status(500).json({ 
            message: 'Erro ao buscar memórias.', 
            error: error.message 
        });
    }
});


// -----------------------------------------------------------
// ROTA CRUCIAL: BUSCA DO CHATBOT 
// Rota: POST /api/search-knowledge
// -----------------------------------------------------------
app.post('/api/search-knowledge', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'A consulta (query) é obrigatória.' });
    }

    try {
        // Busca usando o índice de texto e ordena por relevância (score)
        const knowledgeItems = await Memory.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } } 
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(5);

        // Formatar a resposta para o frontend
        const results = knowledgeItems.map(item => {
            const [title, ...contentParts] = item.texto.split(': ');
            const content = contentParts.join(': ') || item.texto; 

            return {
                id: item._id,
                title: title.trim(),
                content: content.trim(),
                estado: item.estado,
                imageUrl: item.imagemUrl,
                createdAt: item.createdAt,
            };
        });
        
        return res.status(200).json({ results });

    } catch (error) {
        console.error('Erro ao buscar na Base de Conhecimento:', error);
        return res.status(500).json({ 
            message: 'Erro interno ao consultar a base de dados.', 
            error: error.message 
        });
    }
});


// Inicia o servidor (apenas para ambiente local. Vercel usa o module.exports)
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Exporta o app para o Vercel
module.exports = app;
