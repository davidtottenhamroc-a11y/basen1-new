// api/memories.js (Rota POST para a tela de gerenciamento)

const connectDB = require('../utils/db');
const Memory = require('../models/Memory');

module.exports = async (req, res) => {
    // ... headers CORS
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido.' });
    }

    await connectDB();

    const { agente, estado, texto, imagemUrl } = req.body;

    if (!agente || !estado || !texto) {
        return res.status(400).json({ message: 'Dados incompletos.' });
    }

    try {
        const newMemory = new Memory({
            agente,
            estado,
            texto, // Ex: "Título do Artigo: Conteúdo completo da solução"
            imagemUrl
        });

        await newMemory.save();
        
        return res.status(201).json({ message: 'Conteúdo salvo com sucesso!' });

    } catch (error) {
        console.error('Erro ao salvar conteúdo:', error);
        return res.status(500).json({ message: 'Erro interno ao salvar na base de dados.', error: error.message });
    }
};