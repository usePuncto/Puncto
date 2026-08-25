# AFD tipo 6 — eventos sensíveis (REP-P)

| Código | Significado | Builder | Emissão automática Puncto |
|--------|-------------|---------|---------------------------|
| 02 | Retorno de energia (REP-C ou REP-P) | Sim (`eventCode: '02'`) | **Não** — cloud/serverless sem evidência de “energia” |
| 07 | Disponibilidade de serviço | Sim | Sim (transição real via monitor) |
| 08 | Indisponibilidade de serviço | Sim | Sim (transição real / reconcile) |

## Quando 02 seria aplicável

Em REP físico com sensor/UPS. Em REP-P SaaS, só se houver evidência operacional clara de restauração de energia da infraestrutura **e** decisão de produto/jurídica de mapear isso para o código 02. Hoje: suporte de leiaute apenas.

## 07/08 e ARP fora do ar

1. Monitor detecta falha → `repPOutageMarkers.detectedAt` (auditoria operacional).  
2. Evento 08 **não** é gravado na ARP enquanto ela estiver inacessível.  
3. Na recuperação: grava 08 e 07 com **dataHoraGravacao = agora** (persistência).  
4. `detectedAt` não vira `recordedAt` do AFD (sem retroação).
