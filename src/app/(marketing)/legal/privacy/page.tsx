import { Metadata } from 'next';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Puncto coleta, usa e protege seus dados pessoais.',
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      updated="02 de Fevereiro de 2026"
      description="Como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a LGPD."
    >
      <p>
        A <strong>Puncto</strong> (&quot;nós&quot;, &quot;nosso&quot;, &quot;Plataforma&quot;) está comprometida em proteger sua privacidade e a segurança dos seus dados. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD) e demais legislações vigentes.
      </p>

      <p>
        Esta política se aplica a todos os usuários da plataforma Puncto, incluindo nossos clientes diretos (&quot;Assinantes&quot;), os colaboradores dos Assinantes (&quot;Funcionários&quot;) e os clientes finais dos Assinantes (&quot;Consumidores Finais&quot;).
      </p>

      <section>
        <h2>1. Definições de Papéis (Controlador e Operador)</h2>
        <p>Para garantir a transparência sobre as responsabilidades de cada parte, definimos:</p>
        <ul>
          <li><strong>Puncto como Controladora:</strong> Somos responsáveis pelas decisões sobre o tratamento dos dados de cadastro dos nossos <strong>Assinantes</strong> (donos dos estabelecimentos) para fins de faturamento e gestão da conta.</li>
          <li><strong>Puncto como Operadora:</strong> Para os dados inseridos pelos Assinantes em nossos módulos de gestão (incluindo dados de <strong>Funcionários</strong> no módulo de RH e dados de <strong>Consumidores Finais</strong> nos agendamentos), a Puncto atua meramente como processadora de dados. O <strong>Controlador</strong> desses dados é o Assinante (Estabelecimento), sendo ele o responsável legal pela coleta e base legal para o uso dessas informações.</li>
        </ul>
      </section>

      <section>
        <h2>2. Informações que Coletamos</h2>
        <h3>2.1. Do Assinante (Contratante da Puncto)</h3>
        <ul>
          <li><strong>Dados de Cadastro:</strong> Nome completo, CPF/CNPJ, e-mail, telefone e endereço comercial.</li>
          <li><strong>Dados Financeiros:</strong> Dados parciais do cartão ou conta bancária (tokenizados) para cobrança da assinatura da plataforma.</li>
        </ul>

        <h3>2.2. Dos Funcionários do Assinante (Módulo RH e Gestão)</h3>
        <ul>
          <li><strong>Identificação:</strong> Nome, cargo, CPF e matrícula.</li>
          <li><strong>Registro de Ponto:</strong> Horários de entrada e saída, intervalos e, quando ativado pelo Assinante, a <strong>geolocalização</strong> exata no momento do registro do ponto para validação de jornada externa ou remota.</li>
          <li><strong>Dados de Acesso:</strong> Credenciais de login na plataforma.</li>
        </ul>

        <h3>2.3. Dos Consumidores Finais (Clientes dos nossos Assinantes)</h3>
        <ul>
          <li><strong>Dados de Agendamento:</strong> Nome, telefone e histórico de serviços agendados/realizados.</li>
          <li><strong>Dados de Pagamento:</strong> Informações de cartão de crédito/débito necessárias para processar a transação.<br /><em>Nota: A Puncto <strong>não</strong> armazena números completos de cartões de crédito.</em></li>
        </ul>

        <h3>2.4. Informações Coletadas Automaticamente</h3>
        <p>Dados técnicos: Endereço IP, tipo de dispositivo, navegador, logs de acesso (data e hora), cookies essenciais para funcionamento da sessão e segurança.</p>
      </section>

      <section>
        <h2>3. Como Usamos Suas Informações e Bases Legais</h2>
        <p>Utilizamos os dados coletados para as seguintes finalidades, amparadas nas respectivas bases legais da LGPD:</p>
        <ul>
          <li><strong>Fornecer os Serviços (Execução de Contrato):</strong> Gerenciar agendamentos, comandas e ERP; processar registros de ponto e gerar relatórios de folha para o Assinante; intermediar pagamentos entre Consumidor Final e Assinante.</li>
          <li><strong>Processamento de Pagamentos (Execução de Contrato):</strong> A Puncto utiliza a <strong>Stripe</strong> como gateway de pagamento e instituição de pagamento parceira. Atuamos como intermediadores tecnológicos no modelo de &quot;Split Payment&quot;. Os valores pagos pelos Consumidores Finais são processados pela Stripe e direcionados automaticamente para a conta do Assinante, descontadas as taxas aplicáveis. A Puncto não atua como instituição bancária e não detém a custódia permanente dos valores dos Assinantes.</li>
          <li><strong>Segurança e Prevenção à Fraude (Legítimo Interesse/Proteção do Crédito):</strong> Monitorar transações suspeitas e garantir a integridade da plataforma.</li>
          <li><strong>Cumprimento Legal (Obrigação Legal):</strong> Armazenar registros de acesso (Marco Civil da Internet) e dados fiscais/trabalhistas conforme exigido pela Receita Federal e Ministério do Trabalho.</li>
        </ul>
      </section>

      <section>
        <h2>4. Compartilhamento de Informações</h2>
        <p>Não vendemos dados pessoais. Compartilhamos informações apenas nas seguintes hipóteses:</p>
        <ul>
          <li><strong>Processadores de Pagamento (Stripe):</strong> Para viabilizar as transações financeiras e o split de pagamentos.</li>
          <li><strong>Infraestrutura e Tecnologia:</strong> Provedores de hospedagem em nuvem que garantem a estabilidade do serviço.</li>
          <li><strong>Autoridades Governamentais:</strong> Quando exigido por lei, ordem judicial ou para cumprimento de obrigações fiscais e trabalhistas (no caso do módulo de RH).</li>
          <li><strong>Integrações Solicitadas:</strong> Caso o Assinante opte por integrar a Puncto com outros softwares (ex: contabilidade), os dados serão compartilhados conforme instrução do Assinante.</li>
        </ul>
      </section>

      <section>
        <h2>5. Segurança dos Dados</h2>
        <p>Adotamos medidas técnicas e organizacionais robustas, incluindo criptografia em trânsito (TLS) e em repouso, controles de acesso restrito e monitoramento de segurança.</p>
        <div className="legal-highlight">
          <strong>Importante:</strong> A segurança da conta também depende do usuário. O Assinante e seus Funcionários são responsáveis por manter o sigilo de suas senhas. A Puncto não se responsabiliza por acessos não autorizados resultantes de compartilhamento de senha ou falha na custódia das credenciais por parte do usuário.
        </div>
      </section>

      <section>
        <h2>6. Retenção de Dados</h2>
        <p>Manteremos os dados armazenados pelos seguintes períodos:</p>
        <ul>
          <li><strong>Dados da conta do Assinante:</strong> Enquanto a conta estiver ativa ou por 5 anos após o cancelamento (para fins fiscais e defesa em processos).</li>
          <li><strong>Dados de Registro de Ponto (RH):</strong> Pelo período exigido pela legislação trabalhista (atualmente até 5 anos) ou enquanto durar o contrato com o Assinante, o que ocorrer primeiro. Após o término do contrato, os dados podem ser exportados pelo Assinante antes da exclusão.</li>
          <li><strong>Logs de Acesso:</strong> 6 meses, conforme Marco Civil da Internet.</li>
        </ul>
      </section>

      <section>
        <h2>7. Seus Direitos (Titular dos Dados)</h2>
        <p>Você pode exercer seus direitos (Acesso, Correção, Portabilidade, Revogação de Consentimento) entrando em contato conosco.</p>
        <ul>
          <li><strong>Para Consumidores Finais e Funcionários:</strong> Como a Puncto atua como <strong>Operadora</strong> nestes casos, recomenda-se que a solicitação seja feita diretamente ao Estabelecimento (Controlador). Caso a solicitação venha direto para a Puncto, nós a encaminharemos ao Assinante responsável para as devidas providências.</li>
        </ul>
      </section>

      <section>
        <h2>8. Transferência Internacional</h2>
        <p>A Puncto pode utilizar servidores localizados fora do Brasil para hospedagem e processamento de dados. Garantimos que tais transferências ocorram para países que proporcionem grau de proteção de dados pessoais adequado ao previsto na LGPD ou mediante o uso de cláusulas contratuais padrão.</p>
      </section>

      <section>
        <h2>9. Alterações nesta Política</h2>
        <p>Podemos atualizar esta política periodicamente para refletir melhorias na plataforma ou mudanças na legislação. Notificaremos sobre alterações materiais através da plataforma ou por e-mail.</p>
      </section>

      <div className="legal-contact">
        <p>Dúvidas sobre sua privacidade?</p>
        <p>Entre em contato com nosso Encarregado de Dados (DPO):</p>
        <a href="mailto:privacidade@puncto.com.br" className="legal-contact-email">
          suporte@puncto.com.br
        </a>
      </div>
    </LegalPageLayout>
  );
}
