# Copa Psyzon 🏆

**Plataforma de Torneios & Campeonatos**

Sistema completo de gestão de campeonatos gamer, voltado para eventos presenciais da Copa PSYZON. Organize torneios de FIFA (e futuramente Counter-Strike e Sinuca) com cadastro de participantes, chaveamento automático, registro de resultados e histórico de campeões.

## ✨ Funcionalidades

### Tela Inicial e Perfis
- 🎮 Seleção de modo de jogo (FIFA ativo, CS e Sinuca em breve)
- 🔑 Três perfis de acesso: Organizador, Participante e Visitante
- 🔢 Entrada de participantes por código de sala de 4 dígitos

### Cadastro de Participantes
- 📸 Upload de foto de perfil
- 🏳️ Seleção de bandeira/seleção
- 📋 Dados completos: nome, CPF, Instagram, WhatsApp, nick
- 🔍 Busca de cadastro anterior por CPF

### Painel do Organizador
- ⚙️ Configuração de torneio (nome, premiação, quantidade de times)
- 👥 Gerenciamento de times e jogadores
- 🔄 Modo casa e fora (ida e volta)
- 🔐 Geração de códigos de acesso
- 💾 Backup e restauração por JSON

### Motor do Torneio
- 🔀 Embaralhar e gerar chaveamento (4, 8, 16 ou 32 times)
- 🌳 Visualização em árvore ou lista
- ⚽ Registro de resultados com ida, volta e pênaltis
- 🏆 Encerramento de torneio com histórico

### Estatísticas e Ranking
- 🏆 Troféus, finais, semifinais
- ⚽ Gols feitos, gols tomados, saldo de gols
- 📊 Ranking geral de jogadores
- 📜 Histórico completo de campeões

## 🚀 Como Rodar

### Servidor HTTP local

```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (npx)
npx serve .

# Com PHP
php -S localhost:8000
```

Acesse `http://localhost:8000` no navegador.

### Firebase Hosting (Deploy)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica |
| CSS3 | Tema escuro gaming, responsivo |
| JavaScript ES6 | Lógica da aplicação (vanilla, sem dependências) |
| localStorage | Persistência de dados no navegador |
| [Inter](https://rsms.me/inter/) | Tipografia moderna |

## 📐 Estrutura do Projeto

```
psyzon-co/
├── index.html          # Página principal (todas as telas)
├── css/
│   └── styles.css      # Estilos (tema escuro gaming)
├── js/
│   ├── data.js         # Gerenciamento de dados (localStorage)
│   ├── tournament.js   # Motor do torneio (chaveamento, resultados)
│   └── app.js          # Controlador principal (UI, eventos)
├── firebase.json       # Configuração do Firebase Hosting
├── .gitignore          # Arquivos ignorados pelo Git
└── README.md           # Este arquivo
```

## 📱 Compatibilidade

- Chrome 80+ ✅
- Firefox 80+ ✅
- Edge 80+ ✅
- Safari 14+ ✅
- Mobile Chrome ✅
- Mobile Firefox ✅
- Mobile Safari ✅

## 📄 Licença

© 2026 Psyzon Company. Todos os direitos reservados.
