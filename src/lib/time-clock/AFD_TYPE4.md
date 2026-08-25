# AFD tipo 4 — ajuste de relógio

## O que o leiaute exige

Registro tipo 4: data/hora antes, data/hora ajustada, CPF do responsável, NSR, CRC.

## Detecção de desvio ≠ ajuste

| Conceito | Significado |
|----------|-------------|
| Desvio vs HLB | Medição (`measuredOffsetMs` / `absSkewMs`). Limite legal de variação: **30s**. |
| Ajuste do relógio | Alteração efetiva do relógio lógico usado pelo REP-P (`applyLogicalClockAdjust`). |

Os 30s **não** são gatilho de tipo 4.

## O que a Puncto faz agora

- **Não** emite tipo 4 por detecção de desvio ≥ 30s.
- **Não** atribui ajuste automático a `PUNCTO_CLOCK_ADJUST_RESPONSIBLE_CPF`.
- Sync NTP periódico atualiza offset em `system/repPHlbSync` **sem** gravar tipo 4.
- Tipo 4 só via `applyLogicalClockAdjust` / `appendClockAdjust` com **CPF explícito** na operação.

## Ajuste automático e CPF — ponto jurídico

O leiaute exige CPF do responsável. Em sincronismo automático cloud **não há pessoa natural** que “ajustou” o relógio no momento do sync.

Opções a validar juridicamente (não inventar compliance):

1. Tratar o offset contínuo NTP como manutenção do sincronismo (sem tipo 4), e reservar tipo 4 a intervenções administrativas explícitas com responsável identificado; ou
2. Emitir tipo 4 a cada correção material do relógio lógico, com CPF de responsável técnico/metrológico previamente designado (nunca “inventar” a partir de env sem vínculo operacional).

**Decisão de produto atual:** (1) — sem tipo 4 automático; sem uso de `PUNCTO_CLOCK_ADJUST_RESPONSIBLE_CPF`.
