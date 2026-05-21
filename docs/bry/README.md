# Integração Bry — variáveis de ambiente

## Homologação (`BRY_ENV=homologacao`)

| Variável | Valor | Onde encontrar |
|----------|--------|----------------|
| `BRY_CLIENT_ID` | UUID da aplicação | Bry Cloud Homologação → Gestão → Minhas aplicações |
| `BRY_CLIENT_SECRET` | API Key (emitir client_secret) | Mesma tela |
| `BRY_TOKEN_URL` | `https://cloud-hom.bry.com.br/token-service/jwt` | [Obter Token de Acesso](https://bry-developer.readme.io/reference/post_token-service-jwt) |
| `BRY_API_BASE_URL` | `https://fw-hom.bry.com.br` | Variável Postman `{{url_hub}}` (exemplo no corpo da coleção HUB-Signer) |

## Produção

| Variável | Valor |
|----------|--------|
| `BRY_TOKEN_URL` | `https://cloud.bry.com.br/token-service/jwt` |
| `BRY_API_BASE_URL` | `https://fw.bry.com.br` |

## Token (POST `BRY_TOKEN_URL`)

- Header: `Content-Type: application/x-www-form-urlencoded`
- Body: `grant_type=client_credentials&client_id=...&client_secret=...`

## Postman

A coleção `BRy HUB-Signer.postman_collection.json` usa `{{url_hub}}` e `{{access_token}}`, mas **não define** esses valores no JSON. Crie um Environment no Postman:

- `url_hub` = `https://fw-hom.bry.com.br` (hom) ou `https://fw.bry.com.br` (prod)
- `access_token` = preenchido após chamar o endpoint de token

## Endpoints usados pelo Puncto (referência)

- Metadados prescrição: `POST {BRY_API_BASE_URL}/pdf/v1/prescricao`
- Assinar PDF (extensão): `POST {BRY_API_BASE_URL}/fw/v1/pdf/pkcs1/assinaturas/acoes/inicializar` → extensão → `.../finalizar`

Tipos em `prescricao[i][tipo]`: `ATENDIMENTO_CLINICO` (prontuário), `MEDICAMENTO` (receita), `ATESTADO` (atestado).
