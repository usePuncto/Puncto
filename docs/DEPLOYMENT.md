# 🚀 Guia de Deploy na Vercel para o Puncto

Este guia orienta o deploy do site de marketing do Puncto na Vercel.

## Pré-requisitos

- ✅ Conta no GitHub (ou GitLab/Bitbucket)
- ✅ Conta na Vercel (tier gratuito funciona)
- ✅ Seu código enviado para um repositório Git
- ✅ Variáveis de ambiente prontas

---

## Passo 1: Preparar seu Repositório

### 1.1 Enviar seu Código para o GitHub

1. **Inicialize o Git** (se ainda não fez):
   ```bash
   cd C:\Users\begam\Desktop\Puncto
   git init
   git add .
   git commit -m "Commit inicial - Site de marketing pronto para deploy"
   ```

2. **Crie um Repositório no GitHub**:
   - Acesse https://github.com/new
   - Crie um novo repositório (ex: `puncto-marketing`)
   - **NÃO** inicialize com README, .gitignore ou licença

3. **Envie seu Código**:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/puncto-marketing.git
   git branch -M main
   git push -u origin main
   ```

---

## Passo 2: Criar Conta e Projeto na Vercel

### 2.1 Cadastro / Login na Vercel

1. Acesse https://vercel.com
2. Clique em **"Sign Up"** ou **"Log In"**
3. Escolha **"Continue with GitHub"** (recomendado para integração fácil)

### 2.2 Importar seu Projeto

1. Após o login, clique em **"Add New..."** → **"Project"**
2. Clique em **"Import Git Repository"**
3. Encontre seu repositório `puncto-marketing` e clique em **"Import"**

---

## Passo 3: Configurar as Configurações do Projeto

### 3.1 Configuração do Projeto

A Vercel deve detectar o Next.js automaticamente. Verifique estas configurações:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (deixe padrão)
- **Build Command:** `npm run build` (detectado automaticamente)
- **Output Directory:** `.next` (detectado automaticamente)
- **Install Command:** `npm install` (detectado automaticamente)

### 3.2 Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

#### Configuração Firebase (Obrigatório)
```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

#### Firebase Admin (Obrigatório para Servidor)
```
FIREBASE_ADMIN_PROJECT_ID=seu_projeto_id
FIREBASE_ADMIN_CLIENT_EMAIL=email_da_conta_de_servico
FIREBASE_ADMIN_PRIVATE_KEY=sua_chave_privada
```

**OU** (Alternativa - formato JSON):
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

#### Configuração Stripe (Obrigatório para Pagamentos)
```
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para testes)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_...)

# IDs de Preço Stripe
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
```

#### URL da Aplicação (Obrigatório)
```
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```
(Atualize isso após o primeiro deploy com seu domínio real)

#### Serviço de E-mail (ZeptoMail - Recomendado)
O Puncto usa ZeptoMail para e-mails transacionais (confirmações de agendamento, lembretes, convites de profissionais, campanhas).
```
ZEPTOMAIL_API_KEY=seu_token_send_mail
ZEPTOMAIL_FROM_EMAIL=noreply@seu-dominio-verificado.com
ZEPTOMAIL_FROM_NAME=Puncto
```
Obtenha seu token em [ZeptoMail](https://www.zoho.com/zeptomail/) → Agents → SMTP/API → Send Mail Token.

Provedor alternativo (Resend) é suportado via `EMAIL_PROVIDER=resend` e suas respectivas chaves de API.

#### Opcional: Segredo Admin da Plataforma
```
PLATFORM_ADMIN_CREATE_SECRET=sua_string_secreta_aleatoria
```

### 3.3 Onde Encontrar Esses Valores

**Firebase:**
- Firebase Console → Project Settings → General
- Role até "Your apps" → Config do app web
- Copie os valores de `firebaseConfig`

**Firebase Admin:**
- Firebase Console → Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON e extraia os valores OU use o JSON diretamente

**Stripe:**
- Stripe Dashboard → Developers → API Keys
- Copie Secret Key e Publishable Key
- Para Webhook Secret: Webhooks → Add endpoint → Copie o signing secret

---

## Passo 4: Fazer o Deploy

### 4.1 Deploy Inicial

1. Após adicionar todas as variáveis de ambiente, clique em **"Deploy"**
2. Aguarde a conclusão do build (geralmente 2-5 minutos)
3. A Vercel fornecerá uma URL como: `https://puncto-marketing-xyz.vercel.app`

### 4.2 Verificar o Deploy

1. Acesse a URL do deploy
2. Confira que:
   - ✅ Cabeçalho e Rodapé aparecem
   - ✅ Todas as páginas carregam corretamente
   - ✅ Sem erros no console
   - ✅ Imagens e recursos carregam

---

## Passo 5: Configurar Domínio Personalizado (Opcional)

### 5.1 Adicionar Domínio na Vercel

1. Vá no seu projeto → **Settings** → **Domains**
2. Digite seu domínio (ex: `puncto.com.br`)
3. Siga as instruções de configuração DNS da Vercel

### 5.2 Atualizar Registros DNS

Adicione estes registros DNS no seu registrador de domínio:

**Para domínio raiz (puncto.com.br):**
```
Tipo: A
Nome: @
Valor: 76.76.21.21
```

**Para subdomínio www:**
```
Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
```

### 5.3 Atualizar Variáveis de Ambiente

Após configurar o domínio, atualize:
```
NEXT_PUBLIC_APP_URL=https://puncto.com.br
```

Faça redeploy para aplicar as alterações.

---

## Passo 6: Configurar Webhooks do Stripe

### 6.1 Adicionar Endpoint de Webhook no Stripe

1. Acesse Stripe Dashboard → **Webhooks**
2. Clique em **"Add endpoint"**
3. Digite: `https://seu-dominio.vercel.app/api/subscriptions/webhook`
4. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copie o **Signing Secret** e adicione na Vercel como `STRIPE_WEBHOOK_SECRET`

---

## Passo 7: Lista de Verificação Pós-Deploy

- [ ] Testar se a página inicial carrega corretamente
- [ ] Testar todas as páginas de marketing (`/features`, `/pricing`, `/about`, etc.)
- [ ] Verificar se Cabeçalho e Rodapé aparecem em todas as páginas
- [ ] Testar envio do formulário de contato
- [ ] Verificar fluxo de checkout do Stripe (modo teste)
- [ ] Verificar se a autenticação Firebase funciona
- [ ] Confirmar se as variáveis de ambiente estão definidas corretamente
- [ ] Testar em dispositivos móveis
- [ ] Verificar Google Analytics (se configurado)
- [ ] Confirmar se o certificado SSL está ativo (automático com Vercel)

---

## Solução de Problemas

### Build Falha

1. **Verifique os logs de build** no painel da Vercel
2. **Problemas comuns:**
   - Variáveis de ambiente ausentes
   - Erros de TypeScript
   - Dependências faltando
   - Timeout do build (aumente nas configurações)

### Variáveis de Ambiente Não Funcionam

1. Variáveis devem começar com `NEXT_PUBLIC_` para acesso no cliente
2. Faça redeploy após adicionar novas variáveis
3. Verifique se os nomes das variáveis correspondem exatamente (sensível a maiúsculas/minúsculas)

### Erros do Firebase

1. Verifique se os valores de configuração do Firebase estão corretos
2. Confirme se o projeto Firebase tem faturamento habilitado (se usar recursos pagos)
3. Garanta que as credenciais do Firebase Admin são válidas

### Domínio Não Funciona

1. Aguarde 24-48 horas para propagação do DNS
2. Verifique se os registros DNS estão corretos
3. Confirme se o domínio está verificado na Vercel

---

## Deploy Contínuo

A Vercel faz deploy automaticamente ao enviar para a branch main:

1. Faça alterações localmente
2. Commit e push:
   ```bash
   git add .
   git commit -m "Suas alterações"
   git push origin main
   ```
3. A Vercel fará build e deploy automaticamente

---

## Precisa de Ajuda?

- Documentação Vercel: https://vercel.com/docs
- Deploy Next.js: https://nextjs.org/docs/deployment
- Suporte Vercel: https://vercel.com/support

---

## Referência Rápida: Variáveis de Ambiente Obrigatórias

```bash
# Firebase (Cliente)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase (Admin)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_GROWTH
STRIPE_PRICE_ID_PRO

# App
NEXT_PUBLIC_APP_URL
```
