const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://acaciofariav:bDUIR6AjObVu3zjp@cluster0.jxj30jn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

let sitesCollection;

async function startServer() {
  try {
    await client.connect();
    const db = client.db('test'); // troque 'test' pelo nome do seu banco, se quiser
    sitesCollection = db.collection('sites');

    // Cria índice único para subdomain, se ainda não existir
    await sitesCollection.createIndex({ subdomain: 1 }, { unique: true });

    app.post('/api/create', async (req, res) => {
      try {
        const { subdomain, htmlContent } = req.body;
        if (!subdomain || !htmlContent) {
          return res.status(400).json({ error: 'Subdomínio e conteúdo HTML são obrigatórios.' });
        }
        if (!/^[a-z0-9-]+$/.test(subdomain)) {
          return res.status(400).json({ error: 'Nome do subdomínio inválido. Use letras minúsculas, números e hífens.' });
        }

        // Atualiza ou cria documento
        await sitesCollection.updateOne(
          { subdomain },
          { $set: { htmlContent } },
          { upsert: true }
        );

        console.log(`Site criado/atualizado: ${subdomain}`);
        res.status(200).json({ message: 'Site criado/atualizado com sucesso.' });
      } catch (error) {
        console.error('Erro ao criar/atualizar site:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
      }
    });

    app.get('/', async (req, res) => {
      try {
        const host = req.headers.host;
        const mainDomain = 'veedeo.xyz'; // ajuste para o seu domínio real!

        if (!host.endsWith(mainDomain)) {
          return res.status(400).send('Domínio inválido.');
        }

        // Extrai o subdomínio removendo o domínio principal
        const subdomain = host.slice(0, host.length - mainDomain.length - 1);

        if (!subdomain || subdomain === 'www' || subdomain === mainDomain) {
          return res.status(400).send('Subdomínio inválido ou não informado.');
        }

        const site = await sitesCollection.findOne({ subdomain });

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

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (err) {
    console.error('Erro na conexão com o MongoDB:', err);
  }
}

startServer();
