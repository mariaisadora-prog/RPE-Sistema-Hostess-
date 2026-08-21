# RPE Flow — Inteligência de fluxo e conversão

Sistema interno do Grupo RPE para registrar e analisar ações comerciais realizadas nas unidades.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth) · Vercel

---

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (gratuita disponível)
- Conta no [Vercel](https://vercel.com) (para deploy)

---

## Instalação local

```bash
# 1. Entrar na pasta do projeto
cd rpe-flow

# 2. Instalar dependências
npm install

# 3. Copiar arquivo de variáveis de ambiente
cp .env.example .env.local
```

---

## Configuração do Supabase

### 1. Criar projeto

Acesse [supabase.com](https://supabase.com) → New Project.

### 2. Executar as migrations

No painel do Supabase, vá em **SQL Editor** e execute cada arquivo na ordem:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_indexes.sql
supabase/migrations/003_functions.sql
supabase/migrations/004_rls.sql
```

### 3. Executar o seed (dados iniciais)

Ainda no SQL Editor, execute:

```
supabase/seed/seed.sql
```

Isso cria:
- 3 unidades (Mercearia Campos, Bam Bam Café, Mamma Gorda)
- Campanha Oktoberfest 2026
- Perfis, interesses, motivos e concorrentes de exemplo
- 150+ abordagens fictícias distribuídas por hostess, horário e perfil

### 4. Coletar credenciais

No painel Supabase → **Settings → API**:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (apenas servidor) |

---

## Variáveis de ambiente (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

NEXT_PUBLIC_APP_NAME=RPE FLOW
NEXT_PUBLIC_APP_SUBTITLE=Inteligência de fluxo e conversão
NEXT_PUBLIC_APP_TIMEZONE=America/Sao_Paulo
```

> **Atenção:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no client. Nunca use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

---

## Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

---

## Criar o primeiro administrador

1. Crie um usuário no Supabase Auth:
   - Painel → Authentication → Users → Invite user
   - Use o e-mail do administrador

2. Após o primeiro login, execute no SQL Editor do Supabase:

```sql
-- Substitua 'email@exemplo.com' pelo e-mail do admin
INSERT INTO profiles (auth_user_id, name, email, role, active)
SELECT
  id,
  'Nome do Admin',
  email,
  'admin',
  true
FROM auth.users
WHERE email = 'email@exemplo.com';
```

3. Faça login com as credenciais. O sistema redirecionará automaticamente para o dashboard.

---

## Criar outros usuários

Após ter acesso como admin:

1. Acesse `/admin/usuarios` → Novo usuário
2. Defina nome, e-mail e perfil (hostess / gestor / administrador)
3. Para gestores e hostess, vincule as unidades permitidas

---

## Testes

```bash
npm test
```

Os testes cobrem as regras críticas de negócio:
- Fórmulas de conversão de grupos e pessoas
- Proteção contra divisão por zero
- Isolamento de dados por unidade
- Validação de `group_size`
- Detecção de amostra insuficiente para ranking

---

## Build

```bash
npm run build
```

---

## Deploy — Vercel

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) → Import Project
3. Selecione o repositório e a pasta `rpe-flow` como root directory
4. Configure as variáveis de ambiente (as mesmas do `.env.local`)
5. Clique em Deploy

> O Vercel detecta automaticamente o Next.js. Nenhuma configuração adicional é necessária.

---

## Estrutura de rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/registrar` | Todos | Registrar nova abordagem (mobile-first) |
| `/dashboard` | Gestor / Admin | KPIs e análises |
| `/approaches` | Todos | Histórico de abordagens |
| `/relatorios/diario` | Gestor / Admin | Relatório diário com insights |
| `/admin/campanhas` | Gestor / Admin | Gerenciar campanhas |
| `/admin/usuarios` | Admin | Gerenciar usuários |
| `/admin/units` | Admin | Gerenciar unidades |
| `/admin/importar` | Admin | Importar CSV histórico |

---

## Perfis de acesso

| Perfil | Descrição |
|---|---|
| `hostess` | Registra abordagens. Vê apenas seus próprios registros. |
| `manager` | Visualiza dashboard e relatórios das unidades vinculadas. |
| `admin` | Acesso completo: todas as unidades, campanhas, usuários e configurações. |

---

## Timezone

Timestamps são armazenados em UTC (`timestamptz`) e exibidos no fuso `America/Sao_Paulo`. O usuário nunca seleciona o horário manualmente — ele é gerado automaticamente pelo servidor no momento do registro.

---

## Fase 2 (roadmap)

A arquitetura está preparada para:
- Metas por unidade e hostess
- PWA / modo offline
- Integração com POS/TOTVS (faturamento)
- Relatórios automáticos via WhatsApp
- Insights com IA
- QR Code para abordagem
