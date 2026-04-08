# Integração de E-mail ZeptoMail

O Puncto usa **ZeptoMail** (da Zoho) como provedor padrão de e-mails transacionais em todo o app e nas Firebase Functions.

## Configuração

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ZEPTOMAIL_API_KEY` | Sim | Token Send Mail em ZeptoMail Agents → SMTP/API → Send Mail Token |
| `ZEPTOMAIL_FROM_EMAIL` | Não | E-mail remetente (padrão: `noreply@puncto.app`). Deve ser de um domínio verificado no ZeptoMail |
| `ZEPTOMAIL_FROM_NAME` | Não | Nome de exibição do remetente (padrão: `Puncto`) |
| `EMAIL_PROVIDER` | Não | Defina como `zeptomail` (ou `resend`) para sobrescrever a detecção automática |

### Onde Configurar

1. **Next.js / Vercel**: Adicione em Vercel project → Settings → Environment Variables
2. **Firebase Functions**: Adicione via Firebase Console → Functions → Environment config, ou `firebase functions:config:set zeptomail.api_key="..."` (requer mapeamento para `process.env` no código)

Para Firebase Functions, garanta que `ZEPTOMAIL_API_KEY`, `ZEPTOMAIL_FROM_EMAIL` e `ZEPTOMAIL_FROM_NAME` estejam disponíveis no ambiente das Functions (ex: via Secret Manager ou config das Functions).

## Onde os E-mails São Enviados

| Local | Propósito |
|-------|-----------|
| `src/lib/messaging/email.ts` | Cliente de e-mail principal usado pelas rotas de API |
| `src/app/api/campaigns/send/route.ts` | E-mails de campanhas de marketing |
| `src/app/api/professionals/invite/route.ts` | Convite de profissional (link de reset de senha) |
| `punctoFunctions/triggers/onBookingCreate.ts` | Confirmação de agendamento |
| `punctoFunctions/scheduled/reminders.ts` | Lembretes de agendamento (48h, 24h, 3h) |
| `punctoFunctions/scheduled/birthdayReminders.ts` | E-mails de campanha de aniversário |
| `punctoFunctions/scheduled/inventoryAlerts.ts` | Alertas de estoque baixo |
| `punctoFunctions/staff/inviteStaff.ts` | E-mails de convite de equipe |

## Alternando Provedores

Defina `EMAIL_PROVIDER`:

- `zeptomail` – ZeptoMail (padrão quando `ZEPTOMAIL_API_KEY` está definido)
- `resend` – Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
