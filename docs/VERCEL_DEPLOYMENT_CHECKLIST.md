# ✅ Lista de Verificação para Deploy na Vercel

## Etapas Pré-Deploy

### 1. Preparação do Código
- [ ] Todo o código commitado no Git
- [ ] Código enviado para GitHub/GitLab/Bitbucket
- [ ] Sem dados sensíveis no código (verifique `.gitignore`)
- [ ] Build passa localmente (`npm run build`)

### 2. Configuração da Conta Vercel
- [ ] Criar conta em https://vercel.com
- [ ] Conectar conta do GitHub (recomendado)

### 3. Importar Projeto
- [ ] Clicar em "Add New Project"
- [ ] Importar seu repositório
- [ ] Verificar se o framework foi detectado como "Next.js"

---

## Variáveis de Ambiente para Adicionar na Vercel

### Obrigatórias - Firebase (Cliente)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Obrigatórias - Firebase Admin (Servidor)
Escolha UM método:

**Método 1: Variáveis Individuais**
```
FIREBASE_ADMIN_PROJECT_ID=seu-projeto-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Método 2: String JSON (Mais Fácil)**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### Obrigatórias - Stripe
```
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_...)
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
```

### Obrigatória - Aplicação
```
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```
(Atualize após o primeiro deploy com o domínio real)

### Opcionais - Analytics
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=123456789
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=123456
NEXT_PUBLIC_HOTJAR_ID=1234567
NEXT_PUBLIC_CLARITY_ID=abc123xyz
```

### Opcionais - E-mail (ZeptoMail)
```
ZEPTOMAIL_API_KEY=seu_token_send_mail
ZEPTOMAIL_FROM_EMAIL=noreply@puncto.com.br
ZEPTOMAIL_FROM_NAME=Puncto
```

### Opcionais - Tempo Real (Centrifugo)
```
CENTRIFUGO_API_KEY=sua_api_key
CENTRIFUGO_TOKEN_HMAC_SECRET=seu_secret
NEXT_PUBLIC_CENTRIFUGO_URL=https://sua-instancia-centrifugo.com
```

### Opcional - Segurança
```
PLATFORM_ADMIN_CREATE_SECRET=sua_string_secreta_aleatoria
```

---

## Etapas de Deploy

1. **Adicionar Variáveis de Ambiente**
   - Vá em Project Settings → Environment Variables
   - Adicione cada variável acima
   - Selecione ambientes: Production, Preview, Development

2. **Fazer Deploy**
   - Clique em "Deploy"
   - Aguarde o build (2-5 minutos)
   - Verifique os logs de build por erros

3. **Verificar**
   - Acesse a URL do deploy
   - Teste a página inicial
   - Teste todas as páginas de marketing
   - Verifique o console por erros

4. **Configurar Domínio** (se necessário)
   - Settings → Domains
   - Adicione seu domínio
   - Atualize os registros DNS
   - Atualize `NEXT_PUBLIC_APP_URL`

5. **Configurar Webhook do Stripe**
   - Stripe Dashboard → Webhooks
   - Adicione endpoint: `https://seu-dominio.com/api/subscriptions/webhook`
   - Copie o signing secret → Adicione na Vercel como `STRIPE_WEBHOOK_SECRET`
   - Faça redeploy

---

## Comandos Rápidos

```bash
# Testar build localmente
npm run build

# Verificar erros de TypeScript
npm run lint

# Enviar para fazer deploy
git add .
git commit -m "Pronto para deploy"
git push origin main
```

---

## Solução de Problemas

**Build falha:**
- Verifique os logs de build na Vercel
- Confirme que todas as variáveis de ambiente obrigatórias estão definidas
- Teste o build localmente primeiro

**Variáveis de ambiente não funcionam:**
- Devem começar com `NEXT_PUBLIC_` para uso no cliente
- Faça redeploy após adicionar variáveis
- Verifique erros de digitação (sensível a maiúsculas/minúsculas)

**Erros do Firebase:**
- Verifique se os valores de configuração do Firebase estão corretos
- Confirme se o projeto Firebase está ativo
- Garanta que as credenciais do Admin são válidas

---

## Recursos de Marca (Logo e Favicon)

Coloque seus arquivos de marca na pasta `public/`:

| Arquivo | Localização | Uso |
|---------|-------------|-----|
| Logo (SVG) | `public/logo.svg` | Cabeçalho, páginas de marketing (o logo deve incluir o texto "Puncto") |
| Logo branco (SVG) | `public/logo-white.svg` | Rodapé (fundo escuro) – versão branca/clara do seu logo |
| Favicon | `public/favicon.ico` | Aba do navegador, favoritos, PWA |

**Nota:** O componente de logo exibe apenas a imagem (sem texto adicional), então seu SVG deve incluir a marca/texto "Puncto". Para o rodapé em fundos escuros, adicione `logo-white.svg` (versão clara). Se ausente, usa `logo.svg` como fallback.

---

## Recursos de Suporte

- Documentação Vercel: https://vercel.com/docs
- Deploy Next.js: https://nextjs.org/docs/deployment
- Configuração Firebase: https://firebase.google.com/docs/web/setup
