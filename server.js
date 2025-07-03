const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Caminho do arquivo que vai armazenar os dados
const dataFile = path.join(__dirname, 'sites.json');

// Função para ler os dados
function readData() {
  try {
    const content = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

// Função para salvar os dados
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Rota para receber dados do formulário
app.post('/api/create', (req, res) => {
  const { subdomain, htmlContent } = req.body;
  if (!subdomain || !htmlContent) {
    return res.status(400).json({ message: 'Subdomínio e conteúdo são obrigatórios.' });
  }

  const data = readData();

  // Checar se já existe
  if (data[subdomain]) {
    return res.status(400).json({ message: 'Subdomínio já existe. Escolha outro.' });
  }

  // Salvar
  data[subdomain] = htmlContent;
  saveData(data);

  res.json({ message: `Site criado em https://${subdomain}.seudominio.com` });
});

// Middleware para capturar o subdomínio e servir o conteúdo
app.get('*', (req, res) => {
  const host = req.headers.host; // ex: subdominio.seudominio.com:3000
  const hostname = host.split(':')[0]; // remove a porta se existir
  const parts = hostname.split('.');

  if (parts.length < 3) {
    // domínio principal, servir o index.html
    res.sendFile(path.join(__dirname, 'index.html'));
    return;
  }

  const subdomain = parts[0];
  const data = readData();

  if (data[subdomain]) {
    res.send(data[subdomain]);
  } else {
    res.status(404).send('<h1>Subdomínio não encontrado</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
