import { Metadata } from 'next';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos e condições de uso da plataforma Puncto.',
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Termos de Uso e Serviço – Plataforma Puncto"
      updated="02 de Fevereiro de 2026"
    >
      <p>Bem-vindo à <strong>Puncto</strong>.</p>
      <p>
        Estes Termos de Uso (&quot;Termos&quot;) regulam o acesso e utilização da plataforma Puncto (&quot;Plataforma&quot; ou &quot;Serviço&quot;), disponibilizada pela <strong>Puncto Serviços de Tecnologia Ltda.</strong>, doravante referida apenas como &quot;Puncto&quot; ou &quot;Nós&quot;.
      </p>
      <p>
        Ao criar uma conta ou utilizar a Plataforma, você (&quot;Usuário&quot; ou &quot;Você&quot;) concorda expressamente com estes Termos. <strong>Se você não concordar, não utilize o Serviço.</strong>
      </p>

      <section>
        <h2>1. Definições Importantes</h2>
        <ul>
          <li><strong>Usuário/Estabelecimento:</strong> Você, profissional ou empresa que utiliza o Puncto para gerir seu negócio.</li>
          <li><strong>Cliente Final:</strong> O consumidor (ex: paciente, cliente do salão) que agenda e paga serviços oferecidos por Você através da Plataforma.</li>
          <li><strong>Processador de Pagamentos:</strong> A empresa parceira responsável pelo processamento financeiro (atualmente, a <strong>Stripe Brasil</strong>).</li>
        </ul>
      </section>

      <section>
        <h2>2. O Serviço</h2>
        <p><strong>2.1. Natureza da Plataforma:</strong> O Puncto é uma plataforma de software (SaaS) que oferece ferramentas de agendamento, gestão de equipe, ERP e facilitação de pagamentos.</p>
        <p><strong>2.2. Limitação de Atuação:</strong> A Puncto atua exclusivamente como intermediadora tecnológica. <strong>Nós não somos fornecedores dos serviços que você vende</strong>, nem temos vínculo empregatício com sua equipe. Toda a relação de consumo referente ao serviço final é exclusivamente entre Você e seu Cliente Final.</p>
      </section>

      <section>
        <h2>3. Conta e Elegibilidade</h2>
        <p><strong>3.1. Uso Profissional:</strong> O Serviço destina-se a fins comerciais. Ao criar uma conta, você declara ser maior de 18 anos e ter capacidade legal para contratar em nome do seu negócio.</p>
        <p><strong>3.2. Segurança:</strong> Você é responsável por manter suas credenciais confidenciais. Qualquer ação realizada através da sua conta será considerada de sua responsabilidade.</p>
        <p><strong>3.3. Veracidade:</strong> Você garante que as informações fornecidas (CNPJ/CPF, endereço, dados bancários) são verdadeiras e atualizadas. A Puncto reserva-se o direito de solicitar comprovantes para verificação de segurança (KYC - Know Your Customer), conforme exigido pelas leis de prevenção à lavagem de dinheiro.</p>
      </section>

      <section>
        <h2>4. Pagamentos, Recebimentos e Split</h2>
        <p>Como o Puncto facilita o recebimento dos valores pagos pelos seus Clientes Finais, aplicam-se as seguintes regras estritas:</p>
        <p><strong>4.1. Integração com a Stripe:</strong> O processamento de pagamentos é realizado pela Stripe (&quot;Processador&quot;). Ao usar o Puncto para receber pagamentos, <strong>você concorda expressamente com o <a href="https://stripe.com/br/connect-account/legal" target="_blank" rel="noopener noreferrer">Stripe Connected Account Agreement</a></strong>, que inclui os Termos de Serviço da Stripe.</p>
        <p><strong>4.2. Mandato:</strong> Você nomeia a Puncto como sua mandatária limitada exclusivamente para o fim de: (i) integrar sua conta ao Processador; (ii) facilitar o recebimento de fundos pagos pelos seus Clientes Finais; e (iii) repassar os valores devidos para sua conta bancária cadastrada.</p>
        <p><strong>4.3. Fluxo de Valores e Split:</strong></p>
        <ul>
          <li>O Cliente Final paga via Plataforma.</li>
          <li>Os valores transitam pela conta da Puncto junto ao Processador.</li>
          <li>A Puncto retém automaticamente as taxas de serviço (taxa da plataforma + taxas de cartão) acordadas (&quot;Split de Pagamento&quot;).</li>
          <li>O saldo remanescente é transferido para a sua conta bancária (Payout) nos prazos definidos pelo Processador.</li>
        </ul>
        <p><strong>4.4. Chargebacks e Estornos (Sua Responsabilidade):</strong></p>
        <ul>
          <li>O Usuário reconhece que é o <strong>único responsável</strong> por contestações de compra (<em>chargebacks</em>) ou fraudes cometidas pelos seus Clientes Finais.</li>
          <li>Caso um Cliente Final conteste uma compra, o valor será retido ou debitado do seu saldo futuro na Plataforma.</li>
          <li><strong>Cláusula de Ressarcimento:</strong> Se o seu saldo na Plataforma for insuficiente para cobrir estornos, reembolsos ou taxas de chargeback, a Puncto reserva-se o direito de cobrar o valor devido através de boleto bancário, cartão de crédito cadastrado ou outros meios legais de cobrança.</li>
        </ul>
        <p><strong>4.5. Bloqueio de Fundos:</strong> A Puncto ou o Processador poderão reter repasses temporariamente em caso de suspeita de fraude, alto índice de chargebacks ou violação destes Termos, até que a situação seja esclarecida.</p>
      </section>

      <section>
        <h2>5. Planos e Assinaturas (SaaS)</h2>
        <p><strong>5.1. Pagamento pelo Software:</strong> Além das taxas sobre transações (item 4), o uso do software pode estar sujeito a uma assinatura mensal (&quot;SaaS Fee&quot;), conforme o plano escolhido.</p>
        <p><strong>5.2. Inadimplência:</strong> O atraso no pagamento da assinatura poderá resultar na suspensão do acesso ao sistema e na retenção de repasses de transações para quitação do débito da assinatura.</p>
      </section>

      <section>
        <h2>6. Uso Aceitável e Proibições</h2>
        <p>Você concorda em <strong>NÃO</strong>:</p>
        <ul>
          <li>Utilizar a Plataforma para vender produtos/serviços ilegais, pornográficos ou que violem as políticas de uso da Stripe.</li>
          <li>Tentar burlar o sistema de pagamentos da Puncto para evitar taxas.</li>
          <li>Realizar engenharia reversa do software.</li>
          <li>Inserir dados falsos ou enganosos sobre seus serviços.</li>
        </ul>
      </section>

      <section>
        <h2>7. Proteção de Dados (LGPD) e Inteligência Artificial</h2>
        <p><strong>7.1. Papéis na LGPD:</strong> Em relação aos dados pessoais inseridos na Plataforma:</p>
        <ul>
          <li><strong>Você (Usuário)</strong> é o <strong>Controlador</strong> dos dados dos seus Clientes Finais. Cabe a você ter base legal para coletá-los.</li>
          <li><strong>A Puncto</strong> é a <strong>Operadora</strong>, processando esses dados em seu nome para executar o serviço.</li>
        </ul>
        <p><strong>7.2. Segurança:</strong> Adotamos medidas técnicas de ponta para proteger os dados. Contudo, você deve notificar a Puncto imediatamente em caso de suspeita de vazamento de credenciais.</p>
        <p><strong>7.3. Inteligência Artificial:</strong> A Puncto poderá utilizar sistemas de Inteligência Artificial para funcionalidades como sugestão de horários, precificação dinâmica ou atendimento (chatbots). Ao aceitar estes termos, você está ciente de que tais decisões automatizadas estão sujeitas a revisão humana e que a decisão final de negócio é sempre sua.</p>
      </section>

      <section>
        <h2>8. Propriedade Intelectual</h2>
        <p>Todo o design, código-fonte, logotipos e funcionalidades da Puncto são propriedade exclusiva da Puncto Serviços de Tecnologia Ltda. Você mantém a propriedade total sobre os dados do seu negócio (lista de clientes, histórico de vendas) inseridos no sistema.</p>
      </section>

      <section>
        <h2>9. Limitação de Responsabilidade e SLA</h2>
        <p><strong>9.1. &quot;No Estado em que se Encontra&quot; (As Is):</strong> A Plataforma é fornecida sem garantias de que será livre de erros ou ininterrupta. A Puncto não se responsabiliza por falhas decorrentes de terceiros (ex: queda da AWS, falha na Stripe ou operadoras de internet).</p>
        <p><strong>9.2. Limite de Indenização:</strong> Em nenhuma hipótese a Puncto será responsável por lucros cessantes, perda de oportunidades de negócio ou danos indiretos. A responsabilidade financeira total da Puncto perante o Usuário, por qualquer causa, limita-se ao valor total das taxas pagas pelo Usuário à Puncto nos últimos 12 (doze) meses.</p>
      </section>

      <section>
        <h2>10. Cancelamento e Rescisão</h2>
        <p><strong>10.1.</strong> Você pode cancelar sua conta a qualquer momento através do painel de controle.</p>
        <p><strong>10.2.</strong> Em caso de cancelamento, você terá um prazo de 30 dias para exportar seus dados. Após este período, a Puncto poderá excluir seus dados permanentemente.</p>
        <p><strong>10.3.</strong> O cancelamento não isenta o Usuário de pagar por taxas de transações passadas ou chargebacks que ocorram após o encerramento da conta (janela de contestação de cartão de até 180 dias).</p>
      </section>

      <section>
        <h2>11. Alterações nos Termos</h2>
        <p>A Puncto pode alterar estes Termos a qualquer momento para refletir mudanças na lei ou no produto. Notificaremos sobre alterações materiais via e-mail ou aviso na plataforma com 30 dias de antecedência. O uso continuado implica aceitação.</p>
      </section>

      <section>
        <h2>12. Lei Aplicável e Foro</h2>
        <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. As partes elegem o Foro da Comarca de São Paulo/SP para dirimir quaisquer litígios, renunciando a qualquer outro.</p>
      </section>

      <div className="legal-contact">
        <p><strong>Dúvidas Jurídicas ou de Suporte?</strong></p>
        <p>Entre em contato:</p>
        <a href="mailto:legal@puncto.com.br" className="legal-contact-email">
          suporte@puncto.com.br
        </a>
      </div>
    </LegalPageLayout>
  );
}
