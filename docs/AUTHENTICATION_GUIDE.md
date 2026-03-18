# Guia de Autenticação do Puncto

## Visão Geral

O Puncto utiliza um **sistema de autenticação segregado por papéis** com fluxos de cadastro e login completamente separados para três tipos distintos de usuários:

1. **Administradores da Plataforma** - Membros internos da equipe Puncto
2. **Proprietários de Negócios** - Clientes que gerenciam estabelecimentos
3. **Clientes** - Usuários finais que fazem agendamentos

Este guia explica como cada fluxo de autenticação funciona e como utilizá-los.

---

## 🏗️ Arquitetura

### Três Fluxos de Autenticação Separados

```
┌─────────────────────────────────────────────────────────────┐
│                  SISTEMA DE AUTENTICAÇÃO                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬────────────────────┬────────────────────┐
│ Admin Plataforma │ Proprietário       │ Cliente            │
├──────────────────┼────────────────────┼────────────────────┤
│ Criação Manual   │ Autoatendimento    │ Autoatendimento    │
│ (Script Apenas)  │ Cadastro + Setup   │ Cadastro Apenas    │
└──────────────────┴────────────────────┴────────────────────┘
```

### Estrutura de Diretórios

```
src/app/auth/
├── platform/
│   └── login/page.tsx          # Login admin da plataforma
├── business/
│   ├── signup/page.tsx         # Cadastro proprietário de negócio
│   └── login/page.tsx          # Login proprietário de negócio
└── customer/
    ├── signup/page.tsx         # Cadastro de cliente
    └── login/page.tsx          # Login de cliente
```

---

## 1️⃣ Autenticação de Administrador da Plataforma

### Para: Apenas membros internos da equipe Puncto

### Processo de Criação (Manual)

Os administradores da plataforma **não podem se cadastrar** pelo site. Eles devem ser criados manualmente usando o script de administração.

**Comando:**
```bash
npm run create-admin
```

**Prompts Interativos:**
```
🔐 Criar Administrador da Plataforma Puncto

Email do administrador: admin@puncto.com.br
Nome completo: Admin Name
Senha (mínimo 6 caracteres): ********

Níveis de acesso disponíveis:
1. super_admin - Acesso total
2. support - Suporte ao cliente
3. analyst - Analista (somente leitura)

Escolha o nível (1-3) [padrão: 3]: 1

📋 Resumo:
Email: admin@puncto.com.br
Nome: Admin Name
Nível: super_admin

Confirmar criação? (s/n): s

✅ Administrador criado com sucesso!
```

### Login

**URL (Desenvolvimento):**
```
http://localhost:3000?subdomain=admin
```
Em seguida navegue até `/auth/platform/login` ou será redirecionado automaticamente.

**URL (Produção):**
```
https://admin.puncto.com.br
```

**Página:** [/auth/platform/login](src/app/auth/platform/login/page.tsx)

**Validação:**
- Exige `customClaims.platformAdmin === true`
- Exige `customClaims.userType === 'platform_admin'`
- Redireciona para `/platform/dashboard` em caso de sucesso

**Recursos:**
- Tema escuro (visualmente distinto dos logins de negócio/cliente)
- Mensagem de aviso de segurança
- Sem link "esqueci minha senha" (reset manual necessário)
- Sem opções de login social
- Verificações de segurança aprimoradas

### Estrutura de Custom Claims

```typescript
{
  userType: 'platform_admin',
  platformAdmin: true,
  platformRole: 'super_admin' | 'support' | 'analyst'
}
```

### Níveis de Acesso

- **super_admin**: Acesso total à plataforma, pode modificar todos os negócios
- **support**: Pode visualizar todos os negócios, direitos de modificação limitados
- **analyst**: Acesso somente leitura a análises e relatórios

---

## 2️⃣ Autenticação de Proprietário de Negócio

### Para: Proprietários e gerentes de negócios

### Fluxo de Cadastro

**URL:** `/auth/business/signup`

**Página:** [/auth/business/signup/page.tsx](src/app/auth/business/signup/page.tsx)

**Processo:**
```
1. Criação da Conta
   ├── Nome, Email, Senha
   ├── Aceite dos Termos e Privacidade
   └── Redirecionamento automático para o onboarding

2. Informações do Negócio (/onboarding/business)
   ├── Nome do Negócio, Razão Social
   ├── CPF/CNPJ
   ├── Seleção de segmento
   └── Dados de contato

3. Seleção do Plano (/onboarding/plan)
   ├── Escolher faixa de assinatura
   ├── Criar negócio (status: pending_payment)
   └── Redirecionar para Stripe Checkout

4. Pagamento (Stripe)
   ├── PIX ou cartão
   └── Webhook ativa o negócio

5. Atribuição Automática (via API)
   ├── userType: 'business_user'
   ├── businessRoles: {businessId: 'owner'}
   └── primaryBusinessId: businessId
```

### Login

**URL:** `/auth/business/login`

**Página:** [/auth/business/login/page.tsx](src/app/auth/business/login/page.tsx)

**Validação:**
- Exige `customClaims.userType === 'business_user'`
- Redireciona para o painel admin do negócio em caso de sucesso
- Exibe erro se a conta não for de negócio

**Recursos:**
- Tema gradiente azul
- Link "esqueci minha senha"
- Checkbox "lembrar de mim"
- Link para login de cliente (para quem precisa alternar)
- Link para cadastro de negócio

### Estrutura de Custom Claims

```typescript
{
  userType: 'business_user',
  businessRoles: {
    'business-id-123': 'owner',    // Pode ter múltiplos negócios
    'business-id-456': 'manager'
  },
  primaryBusinessId: 'business-id-123'
}
```

### Papéis

- **owner**: Acesso total a todas as funcionalidades do negócio
- **manager**: Permissões configuráveis (definidas nas configurações do negócio)
- **professional**: Acesso limitado (principalmente agendamentos e agenda)

---

## 3️⃣ Autenticação de Cliente

### Para: Usuários finais que fazem agendamentos

### Fluxo de Cadastro

**URL:** `/auth/customer/signup`

**Página:** [/auth/customer/signup/page.tsx](src/app/auth/customer/signup/page.tsx)

**Processo:**
```
1. Criação Rápida da Conta
   ├── Nome, Email, Senha
   ├── Aceite dos Termos e Privacidade
   └── Redirecionar para agendamento/perfil

Sem onboarding necessário - os clientes ficam prontos imediatamente!
```

### Login

**URL:** `/auth/customer/login`

**Página:** [/auth/customer/login/page.tsx](src/app/auth/customer/login/page.tsx)

**Validação:**
- Qualquer usuário autenticado pode fazer login
- Nenhum userType específico exigido (clientes e usuários de negócio podem acessar recursos de cliente)

**Recursos:**
- Interface limpa e simples
- Link "esqueci minha senha"
- Opções de login social (Google, Facebook)
- Opção "continuar como visitante"
- Link para cadastro de negócio (para clientes que querem se tornar proprietários)

### Estrutura de Custom Claims

```typescript
{
  userType: 'customer',
  customerId: 'user-uid-here'
}
```

---

## 🔒 Aplicação de Segurança

### Proteção via Middleware

**Arquivo:** [middleware.ts](middleware.ts)

#### Rotas de Administrador da Plataforma

```typescript
if (subdomain === 'admin') {
  if (!hasAuthCookie) {
    // Redirecionar para login admin da plataforma
    return redirect('/auth/platform/login');
  }

  if (!isPlatformAdmin(customClaims)) {
    // Não é admin da plataforma -> não autorizado
    return redirect('/unauthorized?reason=platform_admin_required');
  }
}
```

#### Rotas Admin do Negócio

```typescript
if (url.pathname.startsWith('/admin')) {
  if (!hasAuthCookie) {
    // Redirecionar para login do negócio
    return redirect('/auth/business/login');
  }

  if (!hasBusinessAccess(customClaims, businessId)) {
    // Cliente ou usuário de negócio não autorizado
    return redirect('/unauthorized?reason=business_admin_required');
  }
}
```

#### Rotas de Cliente

```typescript
if (url.pathname.startsWith('/my-bookings')) {
  if (!hasAuthCookie) {
    // Redirecionar para login de cliente
    return redirect('/auth/customer/login');
  }
}
```

### Funções Utilitárias do Middleware

**Arquivo:** [src/lib/auth/middleware-utils.ts](src/lib/auth/middleware-utils.ts)

```typescript
// Verifica se o usuário é admin da plataforma
isPlatformAdmin(claims: CustomClaims): boolean

// Verifica se o usuário tem acesso a um negócio específico
hasBusinessAccess(claims: CustomClaims, businessId: string): boolean
```

---

## 🛣️ Resumo de Rotas

| Tipo de Usuário | URL de Cadastro | URL de Login | Redirecionamento Após Login |
|-----------------|-----------------|--------------|-----------------------------|
| **Admin Plataforma** | Apenas script manual | `/auth/platform/login` | `/platform/dashboard` |
| **Proprietário** | `/auth/business/signup` | `/auth/business/login` | `/{slug}/admin/dashboard` |
| **Cliente** | `/auth/customer/signup` | `/auth/customer/login` | Página de agendamento ou `/my-bookings` |

### Acesso em Desenvolvimento

| Tipo de Usuário | URL Local | URL de Produção |
|-----------------|-----------|-----------------|
| **Admin Plataforma** | `http://localhost:3000?subdomain=admin` | `https://admin.puncto.com.br` |
| **Proprietário** | `http://localhost:3000?subdomain={slug}` | `https://{slug}.puncto.com.br` |
| **Cliente** | `http://localhost:3000?subdomain={slug}` | `https://{slug}.puncto.com.br` |

---

## 🧪 Testando Fluxos de Autenticação

### 1. Testar Criação de Admin da Plataforma

```bash
# Criar admin da plataforma
npm run create-admin

# Inserir credenciais de teste
Email: test-admin@puncto.test
Nome: Test Admin
Senha: TestAdmin123
Nível: 1 (super_admin)

# Login em
http://localhost:3000?subdomain=admin
```

### 2. Testar Cadastro de Proprietário

```
1. Acesse: http://localhost:3000/auth/business/signup
2. Crie a conta
3. Complete o onboarding (dados do negócio)
4. Selecione o plano
5. Complete o pagamento (use cartão de teste Stripe: 4242 4242 4242 4242)
6. Verifique se userType mudou para 'business_user'
7. Acesse o admin do negócio em: http://localhost:3000?subdomain={seu-slug}/admin
```

### 3. Testar Cadastro de Cliente

```
1. Acesse: http://localhost:3000/auth/customer/signup
2. Crie a conta
3. Será redirecionado imediatamente (sem onboarding)
4. Pode acessar agendamentos ou continuar como visitante
```

### 4. Testar Controle de Acesso

```bash
# Tentar acessar admin da plataforma como usuário de negócio (deve falhar)
1. Faça login como usuário de negócio
2. Navegue para: http://localhost:3000?subdomain=admin
3. Deve redirecionar para /unauthorized

# Tentar acessar admin do negócio como cliente (deve falhar)
1. Faça login como cliente
2. Navegue para: http://localhost:3000?subdomain=salon-a/admin
3. Deve redirecionar para /unauthorized
```

---

## 📝 Observações Importantes

### Atribuição de Tipo de Usuário

- **Admins da Plataforma**: Criados apenas via script `npm run create-admin`
- **Proprietários**: Atribuição automática do tipo `business_user` na conclusão do pagamento do onboarding
- **Clientes**: Tipo padrão para todos os cadastros que não completam o onboarding de negócio

### Higiene de Custom Claims

O sistema remove automaticamente claims incompatíveis ao atribuir tipos de usuário:

```typescript
// Claims de usuário de negócio NÃO podem ter platformAdmin
// Claims de admin da plataforma NÃO podem ter businessRoles
// Claims de cliente NÃO podem ter platformAdmin ou businessRoles
```

### Fluxo de Onboarding

Os proprietários DEVEM completar o fluxo completo de onboarding:
1. Cadastro → 2. Dados do Negócio → 3. Seleção do Plano → 4. Pagamento

Somente após o pagamento bem-sucedido o sistema atribui o tipo `business_user`.

### Sem Login Unificado

**NÃO existe** rota `/auth/login` ou `/auth/signup` unificada. Cada tipo de usuário tem suas próprias páginas de autenticação dedicadas para evitar confusão e garantir segurança.

---

## 🔧 Manutenção

### Adicionar Novo Admin da Plataforma

```bash
npm run create-admin
```

### Promover Usuário Existente a Admin da Plataforma

```bash
npm run set-admin email@exemplo.com
```

O usuário deve fazer logout e login novamente para que as alterações tenham efeito.

### Remover Acesso de Admin da Plataforma

```bash
npm run set-admin email@exemplo.com
# Escolha "remover acesso de admin" quando solicitado
```

---

## 🚨 Solução de Problemas

### Erro "Não Autorizado"

**Sintoma:** Usuário vê página "Não Autorizado" ao tentar acessar admin da plataforma/negócio

**Soluções:**
1. Verifique se o usuário tem o `userType` correto nos custom claims
2. Confirme que o usuário fez logout e login após mudança de papel
3. Verifique se o papel do negócio existe no objeto `businessRoles`
4. Confira os logs do middleware pelo motivo da rejeição

### Usuário Não Consegue Acessar Admin do Negócio

**Sintoma:** Proprietário é redirecionado ao acessar `/admin`

**Soluções:**
1. Verifique se o pagamento do onboarding foi concluído com sucesso
2. Confira se o webhook do Stripe foi processado
3. Verifique se `businessRoles` contém o ID do negócio
4. Confirme que `userType === 'business_user'`

### Login de Admin da Plataforma Falha

**Sintoma:** Admin vê mensagem "Acesso negado"

**Soluções:**
1. Verifique `platformAdmin === true` nos custom claims
2. Verifique `userType === 'platform_admin'`
3. Confirme que o admin foi criado com `npm run create-admin`
4. Tente fazer logout e login novamente

---

## 📚 Arquivos Relacionados

- **Middleware**: [middleware.ts](middleware.ts)
- **Utilitários do Middleware**: [src/lib/auth/middleware-utils.ts](src/lib/auth/middleware-utils.ts)
- **Criação de Usuário**: [src/lib/auth/create-user.ts](src/lib/auth/create-user.ts)
- **API de Onboarding**: [src/app/api/onboarding/create-business/route.ts](src/app/api/onboarding/create-business/route.ts)
- **Tipos de Usuário**: [src/types/user.ts](src/types/user.ts)
- **Script de Criação de Admin**: [scripts/create-platform-admin.ts](scripts/create-platform-admin.ts)
- **Script Set Admin**: [scripts/set-admin.ts](scripts/set-admin.ts)

---

## ✅ Resumo

✨ **Três fluxos de autenticação completamente separados**
🔒 **Aplicação de segurança em múltiplas camadas** (Middleware + Layout + API)
🎯 **Controle de acesso baseado em papéis** com custom claims
🚀 **Onboarding de negócios por autoatendimento** (sem intervenção manual)
🛡️ **Segurança do admin da plataforma** (criação apenas manual)
📱 **Cadastro amigável para clientes** (rápido e simples)

O sistema garante que:
- Clientes não podem acessar áreas admin de negócios
- Proprietários não podem acessar áreas admin da plataforma
- Proprietários não podem acessar admin de outros negócios
- Admins da plataforma têm acesso total (quando necessário)
