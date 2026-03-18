# Puncto - Plataforma Completa de Gestão

Uma plataforma SaaS multi-tenant abrangente para estabelecimentos de serviços e alimentação, oferecendo agendamento, confirmações automatizadas, pagamentos, gestão de restaurantes, controle de ponto e capacidades completas de ERP.

**Login Admin da Plataforma:** `http://localhost:3000/auth/platform/login?subdomain=admin`

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

---

## Visão Geral

O Puncto simplifica as operações diárias de pequenas e médias empresas de beleza, estética, restaurantes e serviços de alimentação—transformando horários vagos em receita e construindo relacionamentos fiéis com clientes.

### Principais Capacidades

- **Agendamento Inteligente** — Reservas 24/7 com confirmações inteligentes e lista de espera automatizada
- **Integração com Calendário Pessoal** — Arquivos .ics, botões Adicionar ao Calendário (Google/Apple/Outlook)
- **Redução de Falta** — Lembretes multicanal (WhatsApp, e-mail, SMS)
- **Pagamentos Integrados** — PIX, cartões de crédito, divisão de comissões via Stripe
- **Cardápio Digital e Contas Virtuais** — Pedidos em mesa com QR codes e atualizações em tempo real
- **Relógio de Ponto Eletrônico** — Controle de ponto por PIN/biometria com gestão de turnos
- **Gestão Unificada** — Agendamentos, vendas, estoque, equipe e relatórios financeiros
- **Pronto para o Brasil** — Notas fiscais (NFS-e/NFC-e), PIX, conformidade LGPD

---

## Arquitetura

### Stack de Tecnologia

**Frontend:**
- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Zustand + TanStack Query (React Query)
- React Hook Form + Zod
- Centrifuge-js (tempo real), react-add-to-calendar, ics.js

**Backend:**
- Next.js API Routes (serverless)
- TypeScript, validação Zod

**Tempo Real:**
- Centrifugo (Fly.io) — WebSocket, pub/sub para agendas, pedidos, contas, ponto

**Banco de Dados e Armazenamento:**
- Firestore (Firebase) — Banco principal
- Firebase Storage — Imagens e uploads

**Workers:**
- Firebase Cloud Functions (2ª Geração) — Lembretes, webhooks, triggers

**Integrações:**
- **Mensagens:** WhatsApp Business Platform (Meta), ZeptoMail/Resend/Mailgun, Twilio (SMS)
- **Pagamentos:** Stripe (Checkout, Billing, Connect)
- **Calendário:** iCalendar (.ics)
- **Fiscal:** TecnoSpeed, eNotas, PlugNotas (NFS-e/NFC-e)
- **Impressão:** Impressoras térmicas ESC/POS

**Infraestrutura:**
- Vercel (web), Fly.io (Centrifugo), Firebase (Functions, Auth)
- Sentry, Vercel Analytics

### Preços Híbridos e Cobrança por Uso

- **Planos:** Grátis, Starter (R$ 69,90), Growth (R$ 189,90), Pro (R$ 399,90), Enterprise (sob medida)
- **Uso medido:** Mensagens WhatsApp e notas fiscais (NFS-e/NFC-e) rastreadas por negócio; excedentes faturados via Stripe

### Funcionalidades por Modalidade

- **Modalidades:** Beleza, Saúde, Varejo, Admin
- **Onboarding:** Cliente seleciona modalidade; persistida para feature flags
- **Frontend:** Renderiza dinamicamente módulos específicos (ex: KDS/Estoque para Varejo, prontuário para Saúde)
- **Backend:** API valida plano + modalidade; endpoints exclusivos de Varejo retornam 403 para negócios não-Varejo

---

## Arquitetura Multi-Instância

Quatro instâncias servidas pelo mesmo app Next.js com roteamento por domínio:

### 1. Site Institucional (`puncto.com.br`)
- **Rota:** `src/app/(marketing)/`
- **Propósito:** Marketing, preços, recursos, blog, jurídico, captura de leads

### 2. Admin da Plataforma (`admin.puncto.com.br`)
- **Rota:** `src/app/platform/`
- **Propósito:** Painel interno do Puncto — negócios, usuários, faturamento, estatísticas

### 3. Painel Admin do Cliente (`{slug}.puncto.com.br/admin`)
- **Rota:** `src/app/tenant/admin/`, `src/app/tenant/[businessSlug]/admin/`
- **Propósito:** Proprietários gerenciam agendamentos, serviços, profissionais, clientes, cardápio, pedidos, estoque, ponto, relatórios financeiros

### 4. Clientes dos Clientes (`{slug}.puncto.com.br`)
- **Rota:** `src/app/tenant/`
- **Propósito:** Agendamento público, pedidos em mesa, portal do cliente; URL curta `b/[slug]` também serve agendamento

### Roteamento

O middleware (`middleware.ts`) trata o subdomínio:
- `subdomain=admin` → admin da plataforma
- Sem subdomínio / www → marketing
- `{business-slug}` → tenant (instância do cliente)

---

## Autenticação e Autorização

### Fluxos

| Tipo de Usuário      | Cadastro                 | Login                       |
|----------------------|--------------------------|-----------------------------|
| Admin Plataforma     | Apenas script manual     | `/auth/platform/login`      |
| Proprietário         | `/industries`            | `/auth/login`               |
| Cliente              | `/auth/customer/signup`  | `/auth/customer/login`      |

### Admin da Plataforma

- Acesso apenas via script
- Criar: `npm run create-admin`
- Conceder acesso: `npm run set-admin email@puncto.com.br` (usuário deve fazer logout e login para claims aplicarem)

### Tipos de Usuário e Claims

| Tipo               | Claims Principais                                        |
|--------------------|----------------------------------------------------------|
| Admin Plataforma   | `userType: 'platform_admin'`, `platformAdmin: true`      |
| Proprietário       | `userType: 'business_user'`, `businessRoles: {id:'owner'}` |
| Gerente/Profissional | `userType: 'business_user'`, `businessRoles: {id:'manager'|'professional'}` |
| Cliente            | `userType: 'customer'`                                   |

Veja [docs/AUTHENTICATION_GUIDE.md](docs/AUTHENTICATION_GUIDE.md) e [docs/QUICK_START.md](docs/QUICK_START.md).

---

## Acesso a Recursos

- **Plano de assinatura:** Grátis, Starter, Growth, Pro, Enterprise
- **Modalidade:** Beleza, Saúde, Varejo, Admin — controla visibilidade de módulos (ex: KDS, cardápio para Varejo; prontuário para Saúde)

**Guarda de componente:**
```tsx
<FeatureGuard feature="restaurantMenu"><RestaurantMenu /></FeatureGuard>
```

**Hook:**
```tsx
const hasMenu = useFeatureAccess('restaurantMenu');
```

---

## Onboarding e Pagamento

Fluxo: Cadastro → Dados do Negócio (modalidade) → Seleção de Plano → Stripe Checkout → Webhook → Painel

- Negócio criado com `pending_payment` até o webhook do Stripe confirmar pagamento
- `PaymentGuard` bloqueia o painel até a assinatura estar ativa

---

## Pré-requisitos

- Node.js 18+
- Firebase (Blaze para Cloud Functions)
- Fly.io (Centrifugo)
- Stripe
- Meta Business (API WhatsApp Business)
- Firebase CLI: `npm install -g firebase-tools`

---

## Começando

### 1. Clonar e Instalar

```bash
git clone https://github.com/yourorg/puncto.git
cd puncto
npm install
```

### 2. Variáveis de Ambiente

Crie `.env.local` com:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="..."

# Centrifugo
NEXT_PUBLIC_CENTRIFUGO_URL=wss://...
CENTRIFUGO_API_KEY=...
CENTRIFUGO_TOKEN_HMAC_SECRET=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_ID_STARTER=...
STRIPE_PRICE_ID_GROWTH=...
STRIPE_PRICE_ID_PRO=...

# WhatsApp (Meta)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...

# E-mail (ZeptoMail padrão)
ZEPTOMAIL_API_KEY=...
ZEPTOMAIL_FROM_EMAIL=...

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Firebase Admin: Project Settings → Service Accounts → Generate new private key → mapear campos JSON para env.

### 3. Firestore

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Seed (Opcional)

```bash
npm run seed
```

Cria negócio de demonstração (slug: `demo`), profissionais, serviços, unidades.

### 5. Executar

```bash
npm run dev
```

- Agendamento: `http://localhost:3000?subdomain=demo`
- Admin: `http://localhost:3000?subdomain=demo/admin`
- Admin plataforma: `http://localhost:3000?subdomain=admin` → redireciona para login

---

## Estrutura do Projeto

```
Puncto/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing, preços, blog, jurídico, contato
│   │   ├── auth/                 # login, signup, platform, business, customer
│   │   ├── platform/             # Admin plataforma (negócios, usuários, faturamento)
│   │   ├── tenant/               # Instância do cliente
│   │   │   ├── page.tsx          # Agendamento público
│   │   │   ├── table/[tableId]/  # Pedidos em mesa
│   │   │   ├── time-clock/       # Ponto do funcionário
│   │   │   ├── admin/            # Painel do negócio (agendamentos, serviços, cardápio, pedidos, etc.)
│   │   │   └── [businessSlug]/admin/  # Mesmo admin com slug dinâmico
│   │   ├── b/[slug]/             # URL curta de agendamento
│   │   ├── marketplace/          # Descoberta de profissional/estabelecimento
│   │   ├── onboarding/           # negócio, plano, pagamento, sucesso
│   │   └── api/                  # Rotas de API
│   ├── components/
│   │   ├── marketing/
│   │   ├── admin/
│   │   ├── booking/
│   │   ├── restaurant/
│   │   ├── features/
│   │   └── providers/
│   ├── lib/
│   │   ├── firebase/, centrifugo/, stripe/
│   │   ├── messaging/            # whatsapp, email
│   │   ├── features/             # businessTypeFeatures
│   │   ├── api/                  # rateLimiting, auth
│   │   └── utils/
│   ├── i18n/, messages/          # next-intl (pt-BR, en-US, es-ES)
│   └── types/
├── punctoFunctions/              # Firebase Cloud Functions
│   └── src/
│       ├── auth/                 # setCustomClaims
│       ├── staff/                # inviteStaff, acceptInvite
│       ├── scheduled/            # reminders, inventoryAlerts, birthdayReminders
│       ├── triggers/             # onBookingCreate, onOrderCreate, onOrderPaid, onClockIn
│       ├── payments/             # processCommission
│       ├── reports/              # dailySummary
│       └── webhooks/             # onWebhookDeliveryCreated
├── scripts/
│   ├── seed.ts
│   ├── set-admin.ts
│   ├── create-platform-admin.ts
│   └── upgrade-to-admin.ts
├── docs/                         # AUTHENTICATION_GUIDE, QUICK_START, WHATSAPP_*, DEPLOYMENT, etc.
├── firestore.rules
├── firestore.indexes.json
├── middleware.ts
└── package.json
```

---

## Scripts Disponíveis

| Comando            | Descrição                                      |
|--------------------|------------------------------------------------|
| `npm run dev`      | Servidor de desenvolvimento (porta 3000)       |
| `npm run build`    | Build de produção                              |
| `npm start`        | Servidor de produção                           |
| `npm run lint`     | ESLint                                         |
| `npm run seed`     | Popular dados de demonstração                  |
| `npm run set-admin` | Conceder admin plataforma a usuário (requer email) |
| `npm run create-admin` | Criar novo admin plataforma (interativo)   |
| `npm run upgrade-admin` | Promover usuário a admin plataforma (requer email) |

---

## Schema do Banco (Firestore)

Coleções principais: `businesses` (com `subscription`, `modality`, `features`), `businesses/{id}/units`, `services`, `professionals`, `customers`, `bookings`, `products`, `orders`, `clockins`, `users`.

Negócios são criados com `subscription.status: 'pending_payment'` durante o onboarding e definidos como `active` quando o webhook do Stripe confirma o pagamento.

---

## Planos de Assinatura

| Recurso       | Grátis | Starter | Growth | Pro | Enterprise |
|---------------|--------|---------|--------|-----|------------|
| Preço (BRL/mês) | R$ 0   | R$ 69,90| R$ 189,90 | R$ 399,90 | Sob medida |
| Unidades      | 1      | 1       | 3      | Ilimitado | Ilimitado |
| WhatsApp      | Limitado| ✅     | ✅ (cota) | ✅ (cota) | Sob medida |
| Pagamentos    | ❌     | ✅      | ✅     | ✅  | ✅ |
| Cardápio/KDS/Pedidos | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ponto         | ❌     | ❌      | ✅     | ✅  | ✅ |
| Estoque       | ❌     | ❌      | ✅     | ✅  | ✅ |
| API / White-label | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## Testes Locais

Use parâmetro de query no localhost:
- `http://localhost:3000?subdomain=demo` — agendamento
- `http://localhost:3000?subdomain=admin` — admin plataforma

Ou arquivo hosts: `127.0.0.1 demo.puncto.local admin.puncto.local` e acesse `http://demo.puncto.local:3000`.

---

## Deploy

- **Web:** Vercel — conecte o repositório, defina variáveis de ambiente, faça deploy
- **Centrifugo:** `fly deploy` (veja `fly.toml`)
- **Firebase Functions:** `firebase deploy --only functions` (faz deploy do codebase `punctoFunctions`)

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) e [docs/VERCEL_DEPLOYMENT_CHECKLIST.md](docs/VERCEL_DEPLOYMENT_CHECKLIST.md).

---

## Documentação

- [AUTHENTICATION_GUIDE.md](docs/AUTHENTICATION_GUIDE.md)
- [QUICK_START.md](docs/QUICK_START.md)
- [WHATSAPP_WEBHOOK_NGROK.md](docs/WHATSAPP_WEBHOOK_NGROK.md)
- [WHATSAPP_EMBEDDED_SIGNUP.md](docs/WHATSAPP_EMBEDDED_SIGNUP.md)
- [EMAIL_ZEPTOMAIL.md](docs/EMAIL_ZEPTOMAIL.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Licença

Proprietário. Todos os direitos reservados. © 2026 Puncto.

---

## Suporte

- Documentação: docs.puncto.com.br
- E-mail: support@puncto.com.br
- Discord: [discord.gg/GGX2mBejDf](https://discord.gg/GGX2mBejDf)
- Status: status.puncto.com.br
