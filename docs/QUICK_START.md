# Puncto - Guia de Início Rápido

## 🚀 Começando com o Novo Sistema de Autenticação

Este guia ajudará você a testar rapidamente os três fluxos de autenticação em desenvolvimento.

---

## Passo 1: Criar sua Conta de Administrador da Plataforma

Execute este comando para criar sua conta de admin:

```bash
npm run create-admin
```

**Preencha os prompts:**
```
Email: admin@puncto.com.br
Nome: Seu Nome
Senha: SuaSenhaSegura123
Nível: 1 (super_admin)
```

✅ **Você agora tem acesso de administrador da plataforma!**

---

## Passo 2: Acessar o Painel Admin da Plataforma

**URL de desenvolvimento:**
```
http://localhost:3000?subdomain=admin
```

Isso redirecionará automaticamente para a página de login admin da plataforma em:
```
http://localhost:3000/auth/platform/login
```

**Faça login com:**
- Email: admin@puncto.com.br
- Senha: SuaSenhaSegura123

✅ **Você está agora no painel admin da plataforma!**

**O que você pode fazer:**
- Visualizar todos os negócios
- Gerenciar todos os usuários
- Ver análises da plataforma
- Gerenciar assinaturas

---

## Passo 3: Testar o Fluxo de Proprietário de Negócio (Opcional)

### Criar uma Conta de Proprietário

1. **Acesse o cadastro de negócio:**
   ```
   http://localhost:3000/auth/business/signup
   ```

2. **Preencha os dados da conta:**
   - Nome: Proprietário de Teste
   - Email: owner@test.com
   - Senha: TestOwner123
   - Aceite os termos

3. **Complete o onboarding do negócio:**
   - Nome do Negócio: Meu Salão de Teste
   - Razão Social: Salão de Teste LTDA
   - CPF/CNPJ: 12345678901
   - Segmento: Salão de Beleza
   - Email: contact@testsalon.com
   - Telefone: (11) 98765-4321

4. **Selecione um plano:**
   - Escolha qualquer plano (Starter, Growth, Pro)

5. **Complete o pagamento:**
   - Use o cartão de teste Stripe: `4242 4242 4242 4242`
   - Qualquer data futura
   - Qualquer CVC

6. **Acesse o admin do negócio:**
   ```
   http://localhost:3000?subdomain=my-test-salon/admin
   ```

✅ **Conta de proprietário criada!**

---

## Passo 4: Testar o Fluxo de Cliente (Opcional)

### Criar uma Conta de Cliente

1. **Acesse o cadastro de cliente:**
   ```
   http://localhost:3000/auth/customer/signup
   ```

2. **Preencha os dados:**
   - Nome: Cliente de Teste
   - Email: customer@test.com
   - Senha: TestCustomer123
   - Aceite os termos

3. **Acesse a área do cliente:**
   - Faça agendamentos em qualquer negócio
   - Visualize agendamentos em `/my-bookings`

✅ **Conta de cliente criada!**

---

## 🔐 Referência de URLs de Autenticação

### Admin da Plataforma (Você)
- **Login:** `/auth/platform/login`
- **Acesso:** `http://localhost:3000?subdomain=admin`
- **Painel:** `/platform/dashboard`

### Proprietários de Negócios
- **Cadastro:** `/auth/business/signup`
- **Login:** `/auth/business/login`
- **Painel:** `http://localhost:3000?subdomain={slug}/admin`

### Clientes
- **Cadastro:** `/auth/customer/signup`
- **Login:** `/auth/customer/login`
- **Agendamentos:** `/my-bookings`

---

## ✅ Lista de Verificação para Testes

Use esta lista para verificar se tudo funciona:

- [ ] Criou admin da plataforma via `npm run create-admin`
- [ ] Fez login no painel admin da plataforma
- [ ] Visualizou a lista de negócios
- [ ] Criou conta de proprietário de teste
- [ ] Completou o onboarding do negócio
- [ ] Acessou o painel admin do negócio
- [ ] Criou conta de cliente de teste
- [ ] Acessou a página de agendamento do cliente

---

## 🚨 Problemas Comuns

### Não Consegue Acessar o Admin da Plataforma
- **Problema:** Erro "Não Autorizado"
- **Solução:** Certifique-se de ter criado o admin via `npm run create-admin` (não cadastro normal)

### Proprietário Travado no Pagamento
- **Problema:** Negócio não ativa após o pagamento
- **Solução:** Verifique se o webhook do Stripe está configurado corretamente para desenvolvimento local

### Página de Login Errada
- **Problema:** Redirecionado para a página de login errada
- **Solução:** Use a URL de login correta para seu tipo de usuário (veja URLs acima)

---

## 📚 Próximos Passos

- Leia o [AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md) completo para informações detalhadas
- Consulte o [README.md](README.md) para documentação geral da plataforma
- Explore os recursos do painel admin da plataforma
- Configure negócios adicionais para testes

---

## 🎉 Você Está Pronto!

Você agora tem:
✅ Acesso de admin da plataforma para gerenciar toda a plataforma
✅ Fluxos de autenticação separados para cada tipo de usuário
✅ Controle de acesso seguro baseado em papéis
✅ Onboarding de negócios por autoatendimento

Bom desenvolvimento! 🚀
