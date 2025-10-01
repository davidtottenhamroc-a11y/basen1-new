const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- Configurações Iniciais ---
app.use(cors()); 
app.use(express.json());

// --- Variáveis de Ambiente ---
const MONGODB_URI = process.env.MONGODB_URI; 
let isConnected = false; // Variável para controlar o estado da conexão

// --- Função de Conexão (Chamada sob demanda) ---
async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('Conexão ao MongoDB estabelecida com sucesso na requisição.');
    } catch (err) {
        console.error('ERRO CRÍTICO NA CONEXÃO MONGODB:', err.message);
        // Não jogamos o erro para não travar o servidor, mas logamos
    }
}

// --- Schemas (Modelo de Dados Memory) ---
const memorySchema = new mongoose.Schema({
    agente: String,
    dataHora: { type: Date, default: Date.now },
    texto: String, 
    estado: String, 
    imagemUrl: String
});

memorySchema.index({ texto: 'text' }); 

// Evitar recompilação do modelo em Serverless
const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema); 

// --- Rotas da API ---

// Rota de Teste
app.get('/', (req, res) => {
    res.send('Servidor Base de Conhecimento API está ativo!');
});

// -----------------------------------------------------------
// ROTA: Salvar Conteúdo na Base de Conhecimento (POST)
// -----------------------------------------------------------
app.post('/api/memories', async (req, res) => {
    await connectDB(); // Tenta conectar antes de qualquer operação de DB

    if (!isConnected) {
        return res.status(503).json({ 
            message: 'Serviço Indisponível. Falha na conexão com o Banco de Dados (Verifique MONGODB_URI/IP Whitelist).',
            error: 'Database Connection Failed'
        });
    }

    try {
        const novaMemoria = new Memory(req.body);
        await novaMemoria.save();
        res.status(201).send(novaMemoria);
    } catch (error) {
        res.status(400).json({ 
            message: 'Erro ao salvar conteúdo.', 
            error: error.message 
        });
    }
});

// -----------------------------------------------------------
// ROTA CRUCIAL: BUSCA DO CHATBOT (POST)
// -----------------------------------------------------------
app.post('/api/search-knowledge', async (req, res) => {
    await connectDB(); // Tenta conectar antes da busca

    if (!isConnected) {
        return res.status(503).json({ 
            message: 'Serviço Indisponível. Falha na conexão com o Banco de Dados.',
            error: 'Database Connection Failed'
        });
    }
    
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'A consulta (query) é obrigatória.' });
    }

    try {
        // ... (Lógica de busca inalterada)
        const knowledgeItems = await Memory.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } } 
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(5);

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

// Exporta o app para o Vercel
module.exports = app;
