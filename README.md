# Copa Psyzon 🏆

**Plataforma de Torneios & Campeonatos — Exceda os limites**

Sistema completo de gestão de campeonatos gamer da Copa PSYZON, com design Liquid Glass Card, persistência via Firebase e separação de perfis: Organizador, Participante, Apostador e Visitante.

## ✨ Funcionalidades

### Login e Perfis
- 🔑 Quatro perfis de acesso: Organizador, Participante, Apostador e Visitante
- 💾 Opção "Lembrar escolha" via localStorage
- 🔐 Login do organizador via Firebase Authentication
- 👁️ Visitante acessa direto sem login
- 🎯 Participante entra com código de 4 dígitos

### Chaveamento
- 🌳 Visualização em árvore e lista
- 🔀 Embaralhamento automático
- ⚽ Mata-mata com suporte a ida e volta
- 📊 Registro de resultados com pênaltis
- 📅 Data e hora por partida
- 📤 Exportar / 📥 Importar JSON

### Painel do Organizador
- ⚙️ Configuração de torneio (nome, premiação, times)
- 👥 Adicionar, editar e remover jogadores
- 🔢 Gerar códigos de acesso de 4 dígitos (uso único)
- 🔒 Ações críticas protegidas por senha (153090)
- 💾 Autosave automático para Firebase

### Ranking e Histórico
- 🏆 Ranking com troféus, gols e saldo
- 📜 Histórico de campeões de torneios anteriores

### Patrocinadores
- 🎠 Carrossel com auto play e navegação manual
- 🖼️ Cards de patrocinadores na página de login (3 por linha)
- ✏️ Gerenciamento pelo organizador via Firebase

### Jogos Suportados
- ⚽ FIFA (liberado)
- 🎱 Sinuca (em breve)
- 🎮 Counter Strike (em breve)

## 🎨 Design

- **Tema:** Liquid Glass Card
- Cards translúcidos com backdrop-filter blur
- Bordas suaves e sombras premium
- Fundo escuro, texto branco, dourado para premiação, vermelho para alertas
- Cor destaque PSYZON (roxo/violeta)
- Totalmente responsivo

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

Acesse `http://localhost:8000/login.html` no navegador.

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
| CSS3 | Liquid Glass Card, responsivo |
| JavaScript ES5+ | Lógica da aplicação (vanilla) |
| Firebase Auth | Login do organizador |
| Firebase Realtime Database | Torneios, jogadores, ranking, histórico |
| Firebase Storage | Imagens de patrocinadores |
| [Inter](https://rsms.me/inter/) | Tipografia moderna |

## 📐 Estrutura do Projeto

```
psyzon-co/
├── login.html           # Página de login (seleção de perfil)
├── chaveamento.html     # Chaveamento, ranking, histórico, patrocinadores
├── escolherjogo.html    # Seleção de jogo (visitante)
├── cadastro.html        # Cadastro de participante (código de acesso)
├── css/
│   └── styles.css       # Liquid Glass Card theme
├── js/
│   ├── firebase-config.js  # Configuração e helpers do Firebase
│   ├── utils.js            # Toast, Modal, localStorage helpers
│   ├── login.js            # Controller da página de login
│   ├── chaveamento.js      # Controller do chaveamento/torneio
│   ├── escolherjogo.js     # Controller da seleção de jogo
│   └── cadastro.js         # Controller do cadastro de participante
├── firebase.json        # Configuração do Firebase Hosting
├── .gitignore           # Arquivos ignorados pelo Git
└── README.md            # Este arquivo
```

## 👥 Perfis de Usuário

| Perfil | Acesso | Descrição |
|---|---|---|
| Organizador | Firebase Auth | Controle total do sistema |
| Participante | Código 4 dígitos | Entra no torneio com código |
| Apostador | Em breve | Sistema de apostas futuro |
| Visitante | Livre | Visualiza chaveamento, ranking e histórico |

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
