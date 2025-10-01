const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Cria a instância do Express
const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Variáveis de Ambiente ---
const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

// --- Conexão Lazy com o Banco ---
async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('✅ Conexão com MongoDB estabelecida');
    } catch (err) {
        console.error('❌ ERRO MongoDB:', err.message);
    }
}

// --- Schema ---
const memorySchema = new mongoose.Schema({
    agente: String,
    dataHora: { type: Date, default: Date.now },
    texto: String,
    estado: String,
    imagemUrl: String
});

memorySchema.index({ texto: 'text' });

const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

// --- Rotas ---
app.get('/', (req, res) => {
    res.send('🚀 API do Base de Conhecimento está rodando!');
});

app.post('/api/memories', async (req, res) => {
    await connectDB();

    if (!isConnected) {
        return res.status(503).json({
            message: 'Serviço indisponível. Verifique o MONGODB_URI',
            error: 'Database Connection Failed'
        });
    }

    try {
        const novaMemoria = new Memory(req.body);
        await novaMemoria.save();
        res.status(201).json(novaMemoria);
    } catch (error) {
        res.status(400).json({
            message: 'Erro ao salvar conteúdo.',
            error: error.message
        });
    }
});

app.post('/api/search-knowledge', async (req, res) => {
    await connectDB();

    if (!isConnected) {
        return res.status(503).json({
            message: 'Serviço indisponível. Verifique o MONGODB_URI',
            error: 'Database Connection Failed'
        });
    }

    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ message: 'A consulta (query) é obrigatória.' });
    }

    try {
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
                createdAt: item.dataHora,
            };
        });

        return res.status(200).json({ results });

    } catch (error) {
        console.error('Erro ao buscar:', error);
        return res.status(500).json({
            message: 'Erro interno ao consultar a base de dados.',
            error: error.message
        });
    }
});

// Exporta o handler para Vercel
module.exports = app;
