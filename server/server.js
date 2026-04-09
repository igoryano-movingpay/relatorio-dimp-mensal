const http = require('http');

const server = http.createServer((req, res) => {
  // Configuração de CORS manual
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rota de GET /relatorio
  if (req.url === '/relatorio' && req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Token Authorization não fornecido' }));
      return;
    }

    fetch('http://server-2.movingpay.corp:55555/api/v1/gerar-relatorio-mensal', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })
      .then(async (response) => {
        const data = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      })
      .catch((error) => {
        console.error("Erro ao chamar API corporativa:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno ao conectar na API Moving Pay' }));
      });
    return;
  }

  // Rota de POST /login
  if (req.url === '/login' && req.method === 'POST') {
    let body = '';

    // Recebendo dados via Stream
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);

        // Chamada para o servidor da Moving Pay
        const response = await fetch('http://server-2.movingpay.corp:55555/api/v1/acessar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ token: data.access_token }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Credenciais inválidas na Moving Pay' }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Erro interno no servidor' }));
      }
    });
  }
});

server.listen(3333, () => console.log('Server rodando na 3333'));