# Modelo de Confirmação de Agendamento via WhatsApp

Para enviar confirmações de agendamento via WhatsApp, é necessário criar e obter aprovação de um modelo de mensagem no Meta Business Manager.

## Modelo: booking_confirmation

1. Acesse [Meta Business Suite](https://business.facebook.com) → WhatsApp Manager → Modelos de mensagem
2. Crie um novo modelo com:
   - **Nome:** `booking_confirmation` (deve corresponder exatamente)
   - **Categoria:** Utilitário
   - **Idioma:** Português (Brasil) - pt_BR

3. **Corpo** (6 variáveis):
   ```
   Olá {{1}}! Seu agendamento foi confirmado.

   Serviço: {{2}}
   Profissional: {{3}}
   Data: {{4}}
   Horário: {{5}}

   {{6}}
   ```

   Variáveis:
   - {{1}} = Nome do cliente
   - {{2}} = Nome do serviço
   - {{3}} = Nome do profissional
   - {{4}} = Data (ex: 15/03/2025)
   - {{5}} = Horário (ex: 14:30)
   - {{6}} = Nome do estabelecimento

4. Envie para aprovação. A Meta geralmente aprova em 24 a 48 horas.

## Habilitando Confirmações via WhatsApp

1. Conecte o WhatsApp em **Admin** → **WhatsApp** (Cadastro Incorporado)
2. Ative **"Enviar por WhatsApp"** na seção Confirmações de Agendamento
3. Faça o deploy das Firebase Functions: `cd punctoFunctions && npm run deploy`
