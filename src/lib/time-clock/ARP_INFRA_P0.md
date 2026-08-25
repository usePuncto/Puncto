# ARP — checklist de infraestrutura (P0 lançamento)

Anexo IX: armazenamento da ARP com redundância, alta disponibilidade e confiabilidade.

**Não marcar ARP como pronta** até todos os itens abaixo verificados no **projeto Firebase/GCP de produção**.

## Evidência auditada em produção (projeto `puncto-7b776`, database `(default)`)

Consulta Firestore Admin API (data da auditoria):

| Campo | Valor observado |
|-------|-----------------|
| locationId | `us-central1` (regional) |
| type | `FIRESTORE_NATIVE` |
| databaseEdition | `STANDARD` |
| pointInTimeRecoveryEnablement | **`POINT_IN_TIME_RECOVERY_DISABLED`** |
| versionRetentionPeriod | `3600s` (1h — típico sem PITR) |
| freeTier | `true` |
| deleteProtectionState | `DELETE_PROTECTION_DISABLED` |

**Conclusão:** infraestrutura ARP **não pronta** para primeiro cliente REP-P. PITR desligado, retenção de versão 1h, sem evidência de multi-region/backup/restore/IAM dedicada.

## Checklist

| # | Item | Verificado? | Evidência / valor |
|---|------|-------------|-------------------|
| 1 | Firestore database location (região) | [x] parcial | `us-central1` — confirmar se aceitável vs requisitos BR |
| 2 | Config regional vs multi-region | [x] | Regional (`us-central1`), **não** multi-region |
| 3 | Redundância / HA do modo escolhido | [ ] | Regional Firestore tem réplicas zonais; documentar SLA GCP e se atende Anexo IX |
| 4 | PITR (Point-in-time recovery) habilitado | [x] **FALHA** | `POINT_IN_TIME_RECOVERY_DISABLED` |
| 5 | Backup schedule / export periódico | [ ] | Não verificado |
| 6 | Retenção ≥ 5 anos (política + storage) | [ ] | Retenção nativa de versões = 1h; precisa export/backup externo |
| 7 | Teste de restore documentado (data do teste) | [ ] | Não realizado |
| 8 | **Service account dedicada** só para escrita ARP/REP-P | [ ] | **P0 lançamento** — não verificado |
| 9 | IAM mínimo (sem owner na SA da app pública) | [ ] | **P0 lançamento** |
| 10 | Cloud Audit Logs em Update/Delete de `repFiscalEvents` | [ ] | Não verificado |
| 11 | Alertas se Update/Delete ocorrer em coleção fiscal | [ ] | Não verificado |

## IAM / SA dedicada — requisito de lançamento (P0 / pré-primeiro cliente)

Não é melhoria futura: a SA usada pelo Next.js/Admin SDK **não** deve ser a mesma conta ampla de toda a plataforma se puder ser isolada.

Objetivo: limitar blast radius e auditar qualquer alteração privilegiada na ARP.

## Dependência

Valores concretos vêm do console GCP/Firebase do ambiente de produção — não inferir do código sozinho. Itens 1–4 acima foram lidos da API do projeto ativo.
