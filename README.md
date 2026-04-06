# Psyzon Stream 🎬

**Streaming P2P de Conteúdo Autorizado com Sessões Compartilhadas**

Plataforma web moderna para streaming progressivo de vídeo via torrents usando WebTorrent, com suporte a **salas compartilhadas (watch party)** para assistir junto com amigos em tempo real. Cole um magnet link ou envie um arquivo `.torrent` e assista ao conteúdo de vídeo enquanto o download acontece em tempo real.

> ⚠️ Esta plataforma destina-se exclusivamente à distribuição e reprodução de conteúdo legal, próprio, licenciado ou de domínio público.

## ✨ Funcionalidades

### Player P2P
- 🧲 Suporte a magnet links e arquivos `.torrent`
- 🎥 Player de vídeo customizado com streaming progressivo
- 📊 Painel de métricas em tempo real (velocidade, peers, progresso)
- 📁 Lista de arquivos com progresso individual
- 📋 Log de atividade com eventos detalhados
- ⌨️ Atalhos de teclado (Espaço, Setas, M, F)

### Sala Compartilhada (Watch Party) 🆕
- 👥 Criar e entrar em salas de exibição com código de convite
- 🔄 Sincronização de reprodução entre dispositivos (play, pause, seek)
- 💬 Chat em tempo real com mensagens do sistema
- 🎬 Suporte a múltiplas fontes de mídia:
  - Upload de arquivos de vídeo
  - Links diretos de mídia
  - Vídeos do YouTube (player oficial incorporado)
- 👑 Modo host (apenas o host controla) ou modo colaborativo
- 📱 Responsivo: funciona em desktop, tablet e celular
- 🔗 Compartilhamento por link de convite
- 📡 Indicadores de sincronização e status em tempo real

### Design
- 🌙 Tema escuro sofisticado e premium
- 📱 Design responsivo (mobile-first)
- ✨ Visual de app real com glassmorphism e gradientes

## 🚀 Como Rodar Localmente

### Opção 1: Servidor Node.js (recomendado para Sala Compartilhada)

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

Acesse `http://localhost:3000` no navegador. O servidor Node.js é **necessário** para o funcionamento da sala compartilhada (Socket.IO).

### Opção 2: Servidor HTTP simples (apenas Player P2P)

```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (npx)
npx serve .

# Com PHP
php -S localhost:8000
```

Acesse `http://localhost:8000` no navegador. Nota: A sala compartilhada não funcionará sem o servidor Node.js.

### Opção 3: Firebase Hosting (Deploy)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

Nota: Para deploy com sala compartilhada, é necessário um backend Node.js separado (ex: Cloud Run, Railway, Render).

## 🏠 Como Funciona a Sala Compartilhada

### Criando uma Sala
1. Acesse a página **Sala Compartilhada** (`sala.html`)
2. Digite seu nome
3. Clique em **Criar Sala**
4. Compartilhe o código da sala ou link de convite com amigos

### Entrando em uma Sala
1. Receba o código da sala de um amigo
2. Acesse a página **Sala Compartilhada**
3. Digite seu nome e o código da sala
4. Clique em **Entrar em Sala**

### Sincronização entre Dispositivos
A reprodução é sincronizada automaticamente entre todos os participantes:
- Quando o host dá **play**, todos reproduzem
- Quando o host dá **pause**, todos pausam
- Quando o host **avança/retrocede**, todos acompanham
- O sistema verifica periodicamente se os players estão sincronizados
- Se houver diferença maior que 2 segundos, a sincronização é ajustada suavemente
- Indicadores visuais mostram o status: **Sincronizado**, **Ajustando...**, **Buffering**

### Player HTML5 vs YouTube
- **Mídia própria/autorizada**: Utiliza player HTML5 customizado com controles completos
- **YouTube**: Utiliza o player oficial incorporado (YouTube IFrame API) dentro de um container premium integrado à interface

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica |
| CSS3 | Tema escuro, animações, responsividade |
| JavaScript ES6+ | Lógica da aplicação |
| [WebTorrent](https://webtorrent.io/) | Engine de torrent no navegador |
| [Socket.IO](https://socket.io/) | Comunicação em tempo real (salas e chat) |
| [Express](https://expressjs.com/) | Servidor HTTP para arquivos estáticos e Socket.IO |
| [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) | Player oficial do YouTube |
| [Lucide Icons](https://lucide.dev/) | Ícones minimalistas |
| [Inter](https://rsms.me/inter/) | Tipografia moderna |

## 📐 Estrutura do Projeto

```
psyzon-co/
├── index.html          # Página principal (Player P2P)
├── sala.html           # Página da Sala Compartilhada (Watch Party)
├── server.js           # Backend Node.js com Socket.IO
├── package.json        # Dependências do projeto
├── css/
│   ├── styles.css      # Estilos base (tema escuro, responsivo)
│   └── sala.css        # Estilos da sala compartilhada
├── js/
│   ├── app.js          # Aplicação principal (WebTorrent + Player)
│   └── sala.js         # Lógica da sala compartilhada (Socket.IO + Sync)
├── firebase.json       # Configuração do Firebase Hosting
├── .gitignore          # Arquivos ignorados pelo Git
└── README.md           # Este arquivo
```

## ⚠️ Limitações do Streaming no Navegador

| Formato | Suporte | Observação |
|---|---|---|
| `.mp4` (H.264) | ✅ Excelente | Melhor formato para streaming progressivo |
| `.webm` (VP8/VP9) | ✅ Bom | Suportado nativamente na maioria dos navegadores |
| `.mkv` | ⚠️ Limitado | Navegadores geralmente não suportam MKV nativamente. Tentativa via blob URL |
| `.avi` | ❌ Não suportado | Formato legado, não suportado por HTML5 Video |
| `.mov` | ⚠️ Parcial | Suporte variável entre navegadores |

### Recomendações para melhor experiência:
- Use arquivos **MP4 com codec H.264** para melhor compatibilidade
- **WebM com VP9** é uma boa alternativa
- Formatos como MKV, AVI, MOV podem não funcionar para streaming progressivo
- O streaming funciona melhor com torrents que possuem muitos seeders

## 📱 Compatibilidade

- Chrome 80+ ✅
- Firefox 80+ ✅
- Edge 80+ ✅
- Safari 14+ ⚠️ (suporte limitado a WebRTC)
- Mobile Chrome ✅
- Mobile Firefox ✅
- Mobile Safari ⚠️

## 📄 Licença

Este projeto é uma ferramenta para streaming de conteúdo autorizado. Uso responsável é de responsabilidade do usuário.
