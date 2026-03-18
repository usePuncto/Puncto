# Configuração do Cadastro Incorporado do WhatsApp (Meta)

Cada negócio conecta seu próprio número de WhatsApp para que as mensagens automatizadas sejam enviadas do número deles para seus clientes. Todas as credenciais são armazenadas apenas no servidor.

**Importante para desenvolvimento com ngrok:**
- O `FB.login` exige **HTTPS** — use `https://xxx.ngrok-free.app`, não `http://localhost`.
- Padrões de URL:
  | Página | URL |
  |--------|-----|
  | Página inicial de marketing | `https://SUA-URL-NGROK.ngrok-free.app/` |
  | Admin da plataforma (Primazia) | `https://SUA-URL-NGROK.ngrok-free.app/?subdomain=primazia` |
  | Admin do negócio (agendamento, WhatsApp, etc.) | `https://SUA-URL-NGROK.ngrok-free.app/?subdomain=SEU_SLUG&app=gestao` |
  | Página pública de agendamento | `https://SUA-URL-NGROK.ngrok-free.app/?subdomain=SEU_SLUG` |

## Pré-requisitos

1. **Tornar-se Provedor de Tecnologia da Meta**  
   Candidate-se em [Meta for Developers](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers/).

2. **Criar um App Meta**  
   - Adicione o produto WhatsApp
   - Configure o Cadastro Incorporado e crie um **config_id**

## Variáveis de Ambiente

Adicione em `.env.local`:

```env
# Meta App (necessário para Cadastro Incorporado)
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret

# ID de configuração do Cadastro Incorporado (do painel do App Meta > WhatsApp > Cadastro Incorporado)
NEXT_PUBLIC_META_APP_ID=seu_app_id
NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID=seu_config_id

# Opcional: redirect_uri para troca de token (apenas se a Meta exigir)
META_WHATSAPP_REDIRECT_URI=
```

## Firestore

A coleção `business_whatsapp_credentials` armazena as credenciais por negócio. É acessada apenas por rotas de API do servidor—nunca pelo cliente.

## Fluxo

1. O negócio (plano Growth/Pro) acessa a página **WhatsApp**
2. Clica em **Conectar WhatsApp** → Cadastro Incorporado da Meta (FB.login com config_id)
3. O usuário completa o fluxo → código de autorização é retornado
4. O frontend envia o código via POST para `/api/whatsapp/connect`
5. O backend troca o código por token de acesso, obtém WABA + número de telefone, armazena no Firestore
6. `sendWhatsApp({ businessId, ... })` usa as credenciais armazenadas para aquele negócio

## UX: Requisito de Login do Facebook

A Meta exige Login do Facebook para o Cadastro Incorporado. Alguns usuários podem não ter conta no Facebook. A interface explica:
- Por que o Facebook é necessário (a Meta detém o WhatsApp, verificação única)
- Alternativa: usuários sem Facebook podem entrar em contato com o suporte para conexão manual do número

No futuro: quando o Puncto se tornar um BSP, poderemos usar fluxos de verificação por QR/telefone que não exigem Facebook.

## Alternativa (Número Único)

Se nenhum `businessId` for passado para `sendWhatsApp`, são usadas as variáveis de ambiente:

```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

Use isso para o número de suporte próprio do Puncto ou antes da configuração do Cadastro Incorporado.
