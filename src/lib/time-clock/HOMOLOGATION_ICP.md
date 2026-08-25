# Homologação criptográfica — certificado ICP-Brasil real da Puncto

Não considerar concluído só com testes unitários (PFX efêmero).

## Checklist

1. [ ] Criar secrets no Google Secret Manager (PFX + senha)
2. [ ] Criar SA dedicada `rep-p-signing` com `secretAccessor` mínimo
3. [ ] Configurar `PUNCTO_VENDOR_ICP_PFX_SECRET` + `PASSWORD_SECRET` na Vercel Production
4. [ ] Configurar `PUNCTO_VENDOR_CNPJ=64571681000120`
5. [ ] Configurar `PUNCTO_AFD_INPI_ID` quando registro INPI existir
6. [ ] Gerar comprovante real (PDF) + validar PAdES
7. [ ] Gerar AFD 004 + `.p7s` + validar CAdES (bytes ISO-8859-1)
8. [ ] Gerar AEJ 002 + `.p7s` + validar CAdES
9. [ ] Verificar cadeia ICP-Brasil, validade, CNPJ no certificado

Ver `ICP_SIGNING_ARCHITECTURE.md` para arquitetura Secret Manager.

## Variáveis

- `PUNCTO_VENDOR_ICP_PFX_SECRET` / `PUNCTO_VENDOR_ICP_PFX_PASSWORD_SECRET` (Production)
- `PUNCTO_VENDOR_CNPJ`
- `PUNCTO_AFD_INPI_ID` (17 dígitos — **bloqueia go-live se ausente/inválido**)

Removido: certificado do empregador, `PUNCTO_SECRETS_ENCRYPTION_KEY`, upload PFX cliente.
