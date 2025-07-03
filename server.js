const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para liberar CORS para qualquer origem
app.use(cors());

// Middleware para interpretar JSON no corpo das requisições
app.use(express.json());

// Caminho do arquivo que armazena os sites criados
const dataFile = path.join(__dirname, 'sites.json');

// Função para ler o arquivo JSON
function readData() {
  try {
    const content = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

// Função para salvar dados no arquivo JSON
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Rota para criar um subdomínio com conteúdo
app.post('/api/create', (req, res) => {
  const { subdomain, htmlContent } = req.body;

  if (!subdomain || !htmlContent) {
    return res.status(400).json({ message: 'Subdomínio e conteúdo são obrigatórios.' });
  }

  // Validação simples do subdomínio (letras, números e hífen)
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return res.status(400).json({ message: 'Subdomínio inválido. Use apenas letras, números e hífen.' });
  }

  const data = readData();

  if (data[subdomain]) {
    return res.status(400).json({ message: 'Subdomínio já existe. Escolha outro.' });
  }

  data[subdomain] = htmlContent;
  saveData(data);

  res.json({ message: `Site criado em https://${subdomain}.veedeo.xyz` });
});

// Middleware para capturar todas as outras requisições e entregar o conteúdo do subdomínio
app.get('*', (req, res) => {
  const host = req.headers.host; // ex: subdominio.veedeo.xyz
  const hostname = host.split(':')[0]; // remove a porta se existir
  const parts = hostname.split('.');

  // Se não houver subdomínio, entrega o index.html
  if (parts.length < 3) {
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
  console.log(`Servidor rodando na porta ${PORT}`);
});
