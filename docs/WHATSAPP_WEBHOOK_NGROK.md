# Configuração do Webhook do WhatsApp com ngrok

Este guia explica como receber mensagens recebidas do WhatsApp no seu ambiente de desenvolvimento local usando ngrok. Com essa configuração, as mensagens enviadas ao número do seu negócio aparecerão no painel admin da plataforma e você poderá responder diretamente.

---

## Pré-requisitos

- API do WhatsApp Business configurada (número de telefone, token de acesso em `.env.local`)
- Conta de admin da plataforma
- Servidor de desenvolvimento Next.js rodando na porta 3000

---

## Passo 1: Instalar o ngrok

### Opção A: Binário oficial (recomendado para Windows)

1. Acesse [ngrok.com/download](https://ngrok.com/download)
2. Baixe **Windows (64 bits)**
3. Descompacte e coloque o `ngrok.exe` em uma pasta (ex: `C:\ngrok\`)
4. (Opcional) Adicione a pasta ao PATH

### Opção B: npm (macOS/Linux)

```bash
npm install -g ngrok
```

---

## Passo 2: Configurar o ngrok (apenas na primeira vez)

1. Cadastre-se em [ngrok.com](https://ngrok.com)
2. Copie seu authtoken em [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Execute:

```bash
ngrok config add-authtoken SEU_AUTHTOKEN_AQUI
```

---

## Passo 3: Iniciar o servidor de desenvolvimento

Em um terminal, inicie o app Next.js:

```bash
npm run dev
```

Mantenha rodando. O app deve estar disponível em `http://localhost:3000`.

---

## Passo 4: Iniciar o ngrok

Em um **segundo terminal**, execute:

```bash
ngrok http 3000
```

Você deve ver algo como:

```
Session Status                online
Forwarding                    https://xxxx-xxxx.ngrok-free.app -> http://localhost:3000
Web Interface                 http://127.0.0.1:4040
```

**Importante:** Copie a URL `https://xxxx-xxxx.ngrok-free.app`. Esta é sua URL pública para o webhook. Mantenha este terminal aberto—o ngrok precisa continuar rodando para receber mensagens.

---

## Passo 5: Configurar o webhook na Meta

1. Acesse [developers.facebook.com](https://developers.facebook.com) → Seu App → **WhatsApp** → **Configuração**
2. Na seção **Webhook**, clique em **Editar**
3. Defina:
   - **URL de retorno:** `https://SUA-URL-NGROK/api/whatsapp/webhook`  
     Exemplo: `https://a08b-2804-14c-878d-8496-c425-1a10-c6f8-badc.ngrok-free.app/api/whatsapp/webhook`
   - **Token de verificação:** O mesmo valor de `WHATSAPP_VERIFY_TOKEN` no seu `.env.local`
4. Clique em **Verificar e Salvar**
5. Certifique-se de que **messages** está inscrito nos campos do Webhook

---

## Passo 6: Visualizar e responder mensagens

1. Abra o painel admin da plataforma:  
   `http://localhost:3000/platform/whatsapp`  
   (Faça login como admin da plataforma se necessário.)

2. Peça para alguém enviar uma mensagem para o número do seu negócio pelo WhatsApp.

3. No painel:
   - Clique em **Atualizar** na lista de contatos
   - A conversa deve aparecer
   - Selecione para ver o histórico de mensagens

4. Para responder: digite sua mensagem e clique em **Enviar**.  
   (O destinatário precisa ter te enviado mensagem nas últimas 24 horas para respostas livres funcionarem.)

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Verificação do webhook falha | Certifique-se de que `WHATSAPP_VERIFY_TOKEN` no `.env.local` corresponde ao valor na Meta |
| Mensagens não aparecem | Clique em **Atualizar**; confirme que ngrok e o servidor de desenvolvimento estão rodando |
| URL do ngrok muda | Cada reinício do ngrok gera uma nova URL—atualize o webhook na Meta |
| "Ainda não está no WhatsApp" | Aguarde 24–48 horas após o cadastro; verifique o status do número na Meta |
| Não consegue enviar (erro de template) | O destinatário precisa te enviar mensagem primeiro; texto livre funciona em até 24h da última mensagem dele |

---

## Referência Rápida

**Iniciar sessão de desenvolvimento:**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

**Formato da URL do webhook:**
```
https://SUA-URL-NGROK/api/whatsapp/webhook
```

**Painel WhatsApp da plataforma:**
```
http://localhost:3000/platform/whatsapp
```
