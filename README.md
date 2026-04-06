# Psyzon Stream 🎬

**Streaming P2P de Conteúdo Autorizado**

Plataforma web moderna para streaming progressivo de vídeo via torrents usando WebTorrent. Cole um magnet link ou envie um arquivo `.torrent` e assista ao conteúdo de vídeo enquanto o download acontece em tempo real.

> ⚠️ Esta plataforma destina-se exclusivamente à distribuição e reprodução de conteúdo legal, próprio, licenciado ou de domínio público.

## ✨ Funcionalidades

- 🧲 Suporte a magnet links e arquivos `.torrent`
- 🎥 Player de vídeo customizado com streaming progressivo
- 📊 Painel de métricas em tempo real (velocidade, peers, progresso)
- 📁 Lista de arquivos com progresso individual
- 📋 Log de atividade com eventos detalhados
- 🌙 Tema escuro sofisticado
- 📱 Design responsivo (mobile-first)
- ⌨️ Atalhos de teclado (Espaço, Setas, M, F)

## 🚀 Como Rodar Localmente

### Opção 1: Servidor HTTP simples

```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (npx)
npx serve .

# Com PHP
php -S localhost:8000
```

Acesse `http://localhost:8000` no navegador.

### Opção 2: Firebase Hosting (Deploy)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

### Opção 3: Abrir direto no navegador

Abra o arquivo `index.html` diretamente no navegador. Nota: Algumas funcionalidades do WebTorrent podem requerer um servidor HTTP.

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica |
| CSS3 | Tema escuro, animações, responsividade |
| JavaScript ES6+ | Lógica da aplicação |
| [WebTorrent](https://webtorrent.io/) | Engine de torrent no navegador |
| [Lucide Icons](https://lucide.dev/) | Ícones minimalistas |
| [Inter](https://rsms.me/inter/) | Tipografia moderna |

## 📐 Estrutura do Projeto

```
psyzon-co/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos (tema escuro, responsivo)
├── js/
│   └── app.js          # Aplicação principal (WebTorrent + Player)
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
