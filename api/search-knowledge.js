// api/search-knowledge.js

const connectDB = require('../utils/db'); // Supondo que você tenha um utilitário para conectar ao DB
const Memory = require('../models/Memory');

// Conectar ao banco de dados (ajuste conforme seu utilitário)
// Se você está usando a estrutura do Vercel, a conexão deve ser feita aqui ou no utilitário de forma a ser reutilizável.
// Exemplo de como importar o dotenv e configurar:
// require('dotenv').config();

// Se o seu `connectDB` for um utilitário simples, você pode chamá-lo:
// await connectDB(); 

module.exports = async (req, res) => {
    // Definir cabeçalhos para CORS (Importante para Vercel/Frontend diferente do Backend)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido.' });
    }

    await connectDB(); // Garante a conexão com o MongoDB

    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'A consulta (query) é obrigatória.' });
    }

    try {
        // 1. Busca por Palavras-Chave/Conteúdo (Usando o índice de texto do Mongoose)
        const knowledgeItems = await Memory.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } } // Para ordenar por relevância
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(5); // Limita aos 5 resultados mais relevantes

        // 2. Formatar a resposta para o frontend
        const results = knowledgeItems.map(item => {
            // Tenta separar o título e o conteúdo do campo 'texto'
            const [title, ...contentParts] = item.texto.split(': ');
            const content = contentParts.join(': ') || item.texto; // Se não conseguir separar, usa o texto completo

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
        return res.status(500).json({ message: 'Erro interno ao consultar a base de dados.', error: error.message });
    }
};