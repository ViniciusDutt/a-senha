# A Senha

Jogo multiplayer desenvolvido com Next.js, NestJS e Socket.IO.

## Tecnologias

### Frontend

- Next.js
- TypeScript
- Socket.IO Client
- Biome

### Backend

- NestJS
- TypeScript
- Socket.IO
- Biome

## Estrutura

```text
a-senha/
├── frontend/
├── backend/
└── README.md
```

## Instalação

Instale as dependências do frontend:

```bash
cd frontend
pnpm install
```

Instale as dependências do backend:

```bash
cd backend
pnpm install
```

## Executando o projeto

Inicie o backend:

```bash
cd backend
pnpm start:dev
```

Inicie o frontend em outro terminal:

```bash
cd frontend
pnpm dev
```

O frontend estará disponível em:

```text
http://localhost:3000
```

## Qualidade de código

Para verificar o código com Biome:

```bash
pnpm check
```

Para corrigir automaticamente:

```bash
pnpm check:fix
```
