# REP-P — Disponibilidade

## Definição

AVAILABLE = API + ARP Firestore + Auth + HLB (sync dentro da política) + caminho de batida.

## Meta vs norma

- Portaria 671: alta disponibilidade; **sem** % fixo.
- `internalOperationalTarget`: 99,9% (interno).

## Monitoramento

| Mecanismo | Intervalo | Papel |
|-----------|-----------|--------|
| `monitorRepPAvailability` | **1 min** (não 5) | Transições 07/08 |
| `syncRepPHlb` | 1 min | Atualiza offset HLB |
| Monitor externo (recomendado) | 30–60s | SLA 99,9% |
| `/health` | sob demanda | Diagnóstico |

5 min de polling deixa até ~5 min de outage invisível — incompatível com orçamento típico de 99,9%/mês (~43 min). Preferir 1 min + probe externo.

## ARP down

`detectedAt` operacional ≠ `dataHoraGravacao` AFD. Ver `AFD_TYPE6.md`.
