const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Sua string de conexão MongoDB
const mongoUrl = "mongodb+srv://acaciofariav:bDUIR6AjObVu3zjp@cluster0.jxj30jn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Banco e coleção
let db;
let sitesCollection;

// Inicializa conexão com o MongoDB
async function connectDB() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db('subdomainSites'); // nome do banco, pode ser qualquer
  sitesCollection = db.collection('sites');
  console.log('Conectado ao MongoDB');
}

connectDB().catch(console.error);

// Validação simples do subdomínio
function isValidSubdomain(subdomain) {
  return /^[a-z0-9-]+$/.test(subdomain);
}

// Endpoint para criar site
app.post('/api/create', async (req, res) => {
  try {
    const { subdomain, htmlContent } = req.body;

    if (!subdomain || !htmlContent) {
      return res.status(400).json({ error: 'Subdomínio e conteúdo HTML são obrigatórios.' });
    }

    if (!isValidSubdomain(subdomain)) {
      return res.status(400).json({ error: 'Nome do subdomínio inválido. Use letras minúsculas, números e hífens.' });
    }

    // Verifica se já existe
    const existing = await sitesCollection.findOne({ subdomain });
    if (existing) {
      return res.status(409).json({ error: 'Subdomínio já existe.' });
    }

    // Insere novo site
    await sitesCollection.insertOne({ subdomain, htmlContent });

    return res.status(200).json({ message: 'Site criado com sucesso.' });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Endpoint para servir site pelo subdomínio
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

    // Busca conteúdo
    const site = await sitesCollection.findOne({ subdomain });

    if (!site) {
      return res.status(404).send('Subdomínio não encontrado.');
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(site.htmlContent);

  } catch (error) {
    console.error('Erro ao servir site:', error);
    res.status(500).send('Erro interno no servidor.');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
