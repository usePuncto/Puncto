# Homologação criptográfica — certificado ICP-Brasil real da Puncto

Não considerar a integração concluída só com testes unitários (PFX efêmero).

Quando `PUNCTO_VENDOR_ICP_PFX_PATH` + `PUNCTO_VENDOR_ICP_PFX_PASSWORD` estiverem configurados com e-CNPJ A1 válido da Puncto:

## Checklist

1. [ ] Gerar comprovante real de batida (PDF)
2. [ ] Validar PAdES embutido (Adobe Reader / Assinador ITC / ITI)
3. [ ] Gerar AFD 004 `.txt` + `.txt.p7s`
4. [ ] Validar CAdES detached do AFD contra os **bytes exatos** do `.txt` (ISO-8859-1)
5. [ ] Gerar AEJ 002 `.txt` + `.txt.p7s`
6. [ ] Validar CAdES detached do AEJ contra os bytes exatos do `.txt`
7. [ ] Verificar cadeia ICP-Brasil até AC raiz
8. [ ] Confirmar identidade/CNPJ da Puncto no certificado
9. [ ] Confirmar validade (notBefore/notAfter) e não revogação (CRL/OCSP quando disponível)
10. [ ] Confirmar nome do AFD: `AFD` + INPI (somente dígitos) + CNPJ/CPF estabelecimento + `REP_P`
11. [ ] Confirmar linha literal `ASSINATURA_DIGITAL_EM_ARQUIVO_P7S` (100 chars) e `.p7s` com sufixo do nome do arquivo

## Variáveis

- `PUNCTO_VENDOR_ICP_PFX_PATH`
- `PUNCTO_VENDOR_ICP_PFX_PASSWORD`
- `PUNCTO_VENDOR_CNPJ`
- `PUNCTO_AFD_INPI_ID` (registro INPI, 17 dígitos numéricos)
- `PUNCTO_NTP_HOSTS` (opcional; default lista oficial ntp.br sem gps.*)
- `PUNCTO_HLB_MAX_SYNC_AGE_MS` / `PUNCTO_HLB_HARD_FAIL_AGE_MS` / `PUNCTO_HLB_SYNC_INTERVAL_MS`

## Tipo 4

Não usar CPF de responsável para sync automático. Ver `AFD_TYPE4.md` (ponto jurídico).
