/**
 * Operational targets vs Portaria 671 requirements (do not conflate).
 *
 * Portaria 671 exige alta disponibilidade do REP-P, mas NÃO fixa percentual numérico.
 * 99,9% abaixo é meta interna da Puncto (internalOperationalTarget), nunca requisito legal.
 */

export const REP_P_COMPLIANCE_NOTES = {
  /** Not a Portaria 671 numeric requirement */
  portaria671Availability:
    'A Portaria 671 exige alta disponibilidade do REP-P; não especifica percentual 99,5% nem 99,9%.',
  /**
   * Meta operacional interna Puncto — NÃO é Portaria671Requirement.
   */
  internalOperationalTarget: {
    availabilityPercent: 99.9,
    kind: 'internalOperationalTarget' as const,
    notPortaria671Requirement: true,
  },
  /** REP-P obligations relevant to Puncto as developer */
  inpiRegistrationRequired: true,
  /** There is NO MTE software homologation/cadastro for REP-P */
  mteSoftwareHomologationRequired: false,
  /**
   * Atestado Técnico e Termo de Responsabilidade:
   * use the official model published by MTE for art. 89 of Portaria 671 (not Anexo VIII / REP-C).
   */
  technicalAttestation:
    'Utilizar o modelo oficial vigente disponibilizado pelo MTE relativo ao art. 89 da Portaria 671/2021. Anexo VIII refere-se a REP-C e não se aplica ao REP-P.',
  /** Intervalo pré-assinalado — not supported */
  preAssinalacaoIntervalo: false,
} as const;
