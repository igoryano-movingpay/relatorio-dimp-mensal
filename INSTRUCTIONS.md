Documentação Técnica: Projeto Relatório Mensal

Pilha Tecnológica Obrigatória
Back-end
Runtime: Node.js (Versão v24.13.1).

Framework: Nenhum. Uso exclusivo do módulo nativo http.

Restrição: É proibido o uso de Express, Fastify ou qualquer framework de roteamento de terceiros.

Front-end
Biblioteca: React.js.

Linguagem: JavaScript puro (JSX). O uso de TypeScript é proibido.

Estilização: Tailwind CSS (configurado via Vite plugin).

Componentes: shadcn/ui.

Gerenciador de Pacotes: npm.

Configurações de Ambiente e Arquitetura
Mapeamento de Caminhos (Alias)
Configuração: Definida via jsconfig.json e vite.config.js.

Padrão de Importação: Utilizar obrigatoriamente o prefixo @/ para referenciar o diretório src/.

Exemplo: import { Button } from "@/components/ui/button".

Estrutura de Diretórios (Flat Monorepo)
root/: Arquivos de configuração (jsconfig.json, vite.config.js, components.json, package.json).

root/server/server.js: Ponto de entrada do servidor Node.js.

root/src/: Código-fonte do Front-end React.

root/src/components/ui/: Diretório de instalação dos componentes shadcn/ui.

Protocolos de Comunicação (Back-end Nativo)
Configuração do Servidor
Porta: 3333.

CORS: Configuração manual de Headers dentro da função http.createServer.

Access-Control-Allow-Origin: *

Access-Control-Allow-Methods: POST, GET, OPTIONS

Access-Control-Allow-Headers: Content-Type

Pre-flight: Tratamento obrigatório do método OPTIONS com retorno de status 204 (No Content) antes do processamento das rotas.

Manipulação de Dados
Entrada de Dados: Recebimento de payloads via Streams utilizando os eventos req.on('data') e req.on('end').

Processamento: Conversão manual de buffers para strings e execução de JSON.parse.

Comandos e Troubleshooting
Execução
Servidor: node server/server.js

Interface: npm run dev