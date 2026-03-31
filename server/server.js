const http = require('http');

const server = http.createServer((req, res) => {
  // Configurando o CORS na mão para o React conseguir falar com o Node
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Resposta para o "pre-flight" do navegador
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/login' && req.method === 'POST') {
    let body = '';

    // Recebendo os dados em pedaços (Streams)
    req.on('data', chunk => {
      body += chunk.toString();
    });

    // Quando terminar de receber, processa o login
    req.on('end', () => {
      const { email, password } = JSON.parse(body);

      if (email === 'admin@admin.com' && password === '123456') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Logado com sucesso!' }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Usuário ou senha incorretos' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Rota não encontrada');
  }
});

server.listen(3333, () => console.log('Servidor nativo rodando na porta 3333'));