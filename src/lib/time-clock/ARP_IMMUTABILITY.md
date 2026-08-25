# ARP — imutabilidade efetiva (Admin SDK)

## O que as rules fazem

`firestore.rules` com `create, update, delete: if false` em `repFiscalEvents` **bloqueia o Client SDK**.

## O que o Admin SDK ainda pode fazer

Credenciais com privilégio Firebase Admin / GCP IAM no projeto Firestore **não são limitadas** por essas rules. Qualquer:

- service account da API Next.js (`firebase-admin`)
- Cloud Functions Admin
- operadores com `roles/datastore.user` / owner no console

pode, tecnicamente, `update`/`delete` documentos fiscais **fora do caminho de aplicação**.

Portanto: **não** descrevemos o armazenamento como “tecnicamente impossível de alterar”.

## Proteções no caminho de aplicação

1. Eventos fiscais só via `tx.create(docRef, data)` com ID determinístico `{repEstablishmentId}_{NSR9}`
2. Se o documento já existe → falha (sem UPSERT / merge em eventos)
3. Nenhum `update`/`delete` de `repFiscalEvents` no código da aplicação
4. Contador NSR (`timeClockMeta/nsr_{establishmentId}`) usa `merge: true` — é meta, não evento fiscal
5. `clockIns.update` só para metadados de comprovante (`receiptStatus`), nunca NSR/hash/timestamp fiscal

## Isolamento adicional recomendado (ops)

- Service account dedicada só-leitura para jobs analíticos
- Conta de escrita do REP-P com IAM mínimo; alertas Cloud Audit Logs em `Delete`/`Update` em `repFiscalEvents`
- Backup PITR Firestore + política de retenção 5 anos
- Proibir scripts de migration que reescrevam ARP

## NSR por estabelecimento

Chave: `repEstablishmentId` = CNPJ 14 ou CPF 11.

Contador: `timeClockMeta/nsr_{repEstablishmentId}`

Matriz e filial **não** compartilham sequência.
