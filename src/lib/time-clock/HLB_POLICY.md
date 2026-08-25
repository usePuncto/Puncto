# Política HLB (Hora Legal Brasileira) — REP-P

## Fontes NTP.br

Lista padrão (oficial https://ntp.br/, sem `gps.*` como primária):

- Césio stratum-1: `a.st1.ntp.br`, `c.st1.ntp.br`, `d.st1.ntp.br`, `e.st1.ntp.br`
- Stratum-2 derivados do césio: `a.ntp.br`, `b.ntp.br`, `c.ntp.br`

`b.st1.ntp.br` **não** consta na tabela pública atual do ntp.br — não hardcodar.

Override sem deploy: `PUNCTO_NTP_HOSTS=host1,host2,...` (gps.* filtrados).

Sync periódico: Cloud Function `syncRepPHlb` (UDP/123 nativo) grava `system/repPHlbSync`. A batida lê esse estado; não exige NTP a cada POST. Em Vercel, se UDP falhar, o cache Firestore permanece a fonte.

## 30 segundos vs tipo 4

| Conceito | Significado |
|----------|-------------|
| 30s | Variação máxima admitida do relógio vs HLB (Portaria 671) |
| AFD tipo 4 | Operação de **ajuste efetivo** do relógio do REP-P |

**Não** emitir tipo 4 só porque o desvio medido passou de 30s.

## Sync periódico (não por batida)

Estado: `lastSuccessfulHlbSync`, `measuredOffsetMs`, `source`, `syncStatus` em memória + `system/repPHlbSync`.

| Parâmetro | Default | Env |
|-----------|---------|-----|
| Intervalo de re-sync | 60s | `PUNCTO_HLB_SYNC_INTERVAL_MS` |
| maxSyncAge (aceita batida sem NTP novo) | 15 min | `PUNCTO_HLB_MAX_SYNC_AGE_MS` |
| hardFailAge (recusa batida) | 60 min | `PUNCTO_HLB_HARD_FAIL_AGE_MS` |

Batida só é recusada quando não dá para assegurar confiabilidade (sync failed / skew >30s na última medição / idade > hardFail).

## Tipo 4 e CPF do responsável — ponto jurídico

O leiaute exige CPF do responsável no tipo 4. Em sincronismo automático cloud **não há pessoa natural** que “ajustou” o relógio.

**Decisão de produto atual:** não fabricar tipo 4 automático nem atribuir a `PUNCTO_CLOCK_ADJUST_RESPONSIBLE_CPF`.

**Validação jurídica necessária** antes de definir se:

1. ajustes automáticos de offset devem gerar tipo 4 com responsável técnico cadastrado; ou  
2. o modelo de “relógio lógico sincronizado continuamente” dispensa tipo 4 até haver ajuste administrativo explícito.

## Probe produção

`GET /api/time-clock/hlb/probe` (+ `?sync=1`)  
Header `x-rep-p-monitor-secret` em produção.

Se `probe.anyOk=false` na Vercel, UDP/123 está bloqueado — usar CF `syncRepPHlb` em runtime com UDP ou hospedar sync fora da Vercel.
