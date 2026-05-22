# WhatsApp automático com Evolution API

O Puncto usa [Evolution API v2](https://doc.evolution-api.com/v2/pt/get-started/introduction) (Baileys) para conectar o WhatsApp de cada negócio via **QR Code**, sem Meta Tech Provider / Embedded Signup.

## O que você precisa fazer

### 1. Subir a Evolution API (Docker)

Na raiz do projeto há `docker-compose.evolution.yml`. Usamos **`evoapicloud/evolution-api:v2.3.7`** — a imagem `atendai/evolution-api:v2.1.1` retorna QR vazio (`{ "count": 0 }`).

Com [Docker](https://www.docker.com/) instalado:

```bash
docker compose -f docker-compose.evolution.yml pull
docker compose -f docker-compose.evolution.yml up -d --force-recreate
```

A API ficará em `http://localhost:8080`. Manager (alternativa): http://localhost:8080/manager

Defina a **mesma** chave em `AUTHENTICATION_API_KEY` no compose e em `EVOLUTION_API_KEY` no `.env.local`.

### 2. Variáveis no `.env.local` do Puncto

```env
# Evolution API (obrigatório para WhatsApp automático)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_do_compose

# URL pública do Puncto (webhooks da Evolution)
# Desenvolvimento: URL https do ngrok
# Produção: https://seudominio.com
EVOLUTION_WEBHOOK_BASE_URL=https://SEU-NGROK.ngrok-free.app
```

Reinicie `npm run dev` após salvar.

### 3. Ngrok (desenvolvimento)

A Evolution precisa chamar o webhook do Puncto. Com ngrok na porta 3000:

```bash
ngrok http 3000
```

Use a URL **https** em `EVOLUTION_WEBHOOK_BASE_URL`.

Acesse o admin pelo ngrok:

```text
https://SUA-URL.ngrok-free.app/tenant/admin/whatsapp?subdomain=SEU_SLUG&app=gestao
```

### 4. Conectar no painel

1. Plano **Growth**, **Pro** ou **Enterprise**
2. Admin → **WhatsApp**
3. **Gerar QR Code** → escaneie no celular (WhatsApp → Dispositivos conectados)
4. Ative **Enviar por WhatsApp** nas confirmações de agendamento

### 5. Firebase Functions (mensagens automáticas)

Configure as mesmas variáveis `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no ambiente das Functions (Firebase console ou `.env` do deploy).

Com WhatsApp conectado e **Enviar por WhatsApp** ativo (`confirmationChannels` inclui `whatsapp`):

| Mensagem | Quando | Função |
|----------|--------|--------|
| Confirmação de agendamento | Ao criar booking | `onBookingCreate` |
| Lembrete 24h antes | ~24h antes da consulta (job a cada hora) | `sendBookingReminders` |
| Feliz aniversário | 8h (America/Sao_Paulo) no dia do aniversário | `sendBirthdayReminders` |

**Aniversário:** cadastre `birthDate` (yyyy-MM-dd) no cliente/paciente/aluno. E-mail de aniversário segue ZeptoMail; WhatsApp usa o mesmo canal de confirmação. Para desativar: `settings.birthdayCampaignsEnabled = false` no documento do negócio.

**Lembrete:** apenas **24h** via WhatsApp; e-mails continuam em 48h, 24h e 3h.

## Fluxo técnico

1. Uma instância Evolution por negócio: `puncto_{businessId}`
2. QR via `POST /api/whatsapp/evolution/connect`
3. Status em `GET /api/whatsapp/status?businessId=`
4. Envio: `sendWhatsApp({ businessId, text })` → Evolution `POST /message/sendText/{instance}`
5. Webhook: `POST /api/whatsapp/evolution/webhook?businessId=`

## Avisos

- API não oficial: risco de bloqueio do número se houver spam.
- Sessão pode cair; reconecte escaneando o QR de novo.
- Cada reinício do ngrok exige atualizar `EVOLUTION_WEBHOOK_BASE_URL` e reconectar instâncias se o webhook antigo ficar inválido.

## Meta (legado)

Rotas `/api/whatsapp/connect` (Facebook) permanecem no código, mas a UI usa Evolution. Variáveis `NEXT_PUBLIC_META_*` não são mais necessárias para o fluxo padrão.

Documentação antiga: [WHATSAPP_EMBEDDED_SIGNUP.md](./WHATSAPP_EMBEDDED_SIGNUP.md)
