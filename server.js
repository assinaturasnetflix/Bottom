const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para receber JSON
app.use(express.json());

// Banco SQLite (arquivo único)
const db = new sqlite3.Database(path.join(__dirname, 'sites.db'), (err) => {
  if (err) {
    console.error('Erro ao abrir o banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco SQLite.');
  }
});

// Cria tabela se não existir
db.run(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subdomain TEXT UNIQUE,
    htmlContent TEXT
  )
`);

// Endpoint para criar site
app.post('/api/create', (req, res) => {
  try {
    const { subdomain, htmlContent } = req.body;

    if (!subdomain || !htmlContent) {
      return res.status(400).json({ error: 'Subdomínio e conteúdo HTML são obrigatórios.' });
    }

    // Validação simples do subdomínio
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({ error: 'Nome do subdomínio inválido. Use letras minúsculas, números e hífens.' });
    }

    // Tenta inserir no banco
    const sql = `INSERT INTO sites (subdomain, htmlContent) VALUES (?, ?)`;

    db.run(sql, [subdomain, htmlContent], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Subdomínio já existe.' });
        } else {
          console.error('Erro ao inserir no banco:', err);
          return res.status(500).json({ error: 'Erro interno ao salvar no banco.' });
        }
      }

      return res.status(200).json({ message: 'Site criado com sucesso.' });
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Endpoint para servir o site pelo subdomínio
app.get('/', (req, res) => {
  // Como você vai usar subdomínio com wildcard, pegue o host e extraia o subdomínio
  const host = req.headers.host; // exemplo: acass.veedeo.xyz
  const mainDomain = 'veedeo.xyz';

  if (!host.endsWith(mainDomain)) {
    return res.status(400).send('Domínio inválido.');
  }

  // Pega o subdomínio
  const subdomain = host.replace(`.${mainDomain}`, '');

  if (!subdomain || subdomain === 'www' || subdomain === mainDomain) {
    return res.status(400).send('Subdomínio inválido ou não informado.');
  }

  // Busca conteúdo no banco
  db.get(`SELECT htmlContent FROM sites WHERE subdomain = ?`, [subdomain], (err, row) => {
    if (err) {
      console.error('Erro ao consultar banco:', err);
      return res.status(500).send('Erro interno no servidor.');
    }

    if (!row) {
      return res.status(404).send('Subdomínio não encontrado.');
    }

    // Retorna o HTML salvo
    res.setHeader('Content-Type', 'text/html');
    res.send(row.htmlContent);
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
