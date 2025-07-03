const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para JSON e CORS
app.use(express.json());
app.use(cors());

// MongoDB URI - **Use variável de ambiente na prática!**
const uri = 'mongodb+srv://acaciofariav:bDUIR6AjObVu3zjp@cluster0.jxj30jn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Cliente MongoDB e conexão
let collection;

async function connectDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('subdomainsDB'); // nome do banco (pode ser qualquer)
    collection = db.collection('sites'); // nome da coleção
    console.log('Conectado ao MongoDB Atlas');
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error);
  }
}

// Conecta no DB antes de iniciar o servidor
connectDB();

// POST /api/create - cria site com subdomínio e HTML
app.post('/api/create', async (req, res) => {
  try {
    const { subdomain, htmlContent } = req.body;

    if (!subdomain || !htmlContent) {
      return res.status(400).json({ error: 'Subdomínio e conteúdo HTML são obrigatórios.' });
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({ error: 'Nome do subdomínio inválido. Use letras minúsculas, números e hífens.' });
    }

    // Verifica se já existe subdomínio
    const existing = await collection.findOne({ subdomain });
    if (existing) {
      return res.status(409).json({ error: 'Subdomínio já existe.' });
    }

    // Insere novo documento
    await collection.insertOne({ subdomain, htmlContent });

    return res.status(200).json({ message: 'Site criado com sucesso.' });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// GET / - serve site pelo subdomínio (host)
app.get('/', async (req, res) => {
  try {
    const host = req.headers.host; // ex: acass.veedeo.xyz
    const mainDomain = 'veedeo.xyz';

    if (!host.endsWith(mainDomain)) {
      return res.status(400).send('Domínio inválido.');
    }

    const subdomain = host.replace(`.${mainDomain}`, '');

    if (!subdomain || subdomain === 'www' || subdomain === mainDomain) {
      return res.status(400).send('Subdomínio inválido ou não informado.');
    }

    const site = await collection.findOne({ subdomain });

    if (!site) {
      return res.status(404).send('Subdomínio não encontrado.');
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(site.htmlContent);

  } catch (error) {
    console.error('Erro ao buscar site:', error);
    res.status(500).send('Erro interno no servidor.');
  }
});

// Start servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
