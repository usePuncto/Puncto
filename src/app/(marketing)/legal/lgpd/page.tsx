import { Metadata } from 'next';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Conformidade LGPD',
  description: 'Como o Puncto cumpre a Lei Geral de Proteção de Dados.',
};

export default function LGPDPage() {
  return (
    <LegalPageLayout
      title="Conformidade com a LGPD"
      updated="02 de Fevereiro de 2026"
      description="Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018). Como o Puncto garante a proteção dos dados pessoais."
    >
      <section>
        <h2>Nosso compromisso com a LGPD</h2>
        <p>
          O Puncto está totalmente comprometido com a conformidade à LGPD. Implementamos medidas
          técnicas e organizacionais rigorosas para garantir a proteção dos dados pessoais de
          nossos usuários diretos e dos terceiros (clientes e colaboradores) cujos dados são
          processados em nossa plataforma.
        </p>
      </section>

      <section>
        <h2>1. O que é a LGPD?</h2>
        <p>
          A Lei Geral de Proteção de Dados Pessoais (LGPD) é a legislação brasileira que regula
          o tratamento de dados pessoais por empresas públicas e privadas. A lei visa proteger
          os direitos fundamentais de liberdade e privacidade e o livre desenvolvimento da
          personalidade da pessoa natural.
        </p>
      </section>

      <section>
        <h2>2. Papéis na LGPD</h2>

        <h3>2.1 Puncto como Controlador</h3>
        <p>
          Quando você (dono do negócio) cria uma conta no Puncto, nós somos o <strong>Controlador</strong> dos
          seus dados pessoais de cadastro (seu nome, CPF, e-mail, dados de faturamento). Nós decidimos
          como esses dados são usados para prestar o serviço a você.
        </p>

        <h3>2.2 Puncto como Operador</h3>
        <p>
          Quando você usa o Puncto para gerenciar seu negócio, nós atuamos como <strong>Operador</strong>.
          Isso inclui:
        </p>
        <ul>
          <li>Dados dos seus <strong>Clientes Finais</strong> (agendamentos, histórico, pagamentos via Stripe).</li>
          <li>Dados dos seus <strong>Colaboradores</strong> (registros de ponto, geolocalização e cadastro no módulo de RH).</li>
        </ul>
        <p>
          Neste cenário, <strong>você é o Controlador</strong> desses dados e é o responsável principal
          por garantir a base legal para o tratamento (ex: contrato de trabalho ou consentimento do cliente).
        </p>
      </section>

      <section>
        <h2>3. Bases Legais Utilizadas</h2>
        <p>Tratamos dados pessoais com base nas seguintes hipóteses legais:</p>
        <ul>
          <li><strong>Execução de contrato:</strong> Para processar a assinatura do software e, no caso do módulo de RH, para viabilizar o cumprimento do contrato de trabalho entre você e seu colaborador.</li>
          <li><strong>Obrigação legal:</strong> Para cumprimento de exigências fiscais (emissão de notas) e trabalhistas (registros de jornada).</li>
          <li><strong>Legítimo interesse:</strong> Para prevenção à fraude, segurança da plataforma e melhorias no serviço.</li>
          <li><strong>Consentimento:</strong> Apenas para finalidades opcionais, como comunicações de marketing.</li>
        </ul>
      </section>

      <section>
        <h2>4. Direitos dos Titulares</h2>
        <p>Garantimos aos titulares de dados o exercício de todos os direitos previstos na LGPD:</p>
        <ul>
          <li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los.</li>
          <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> De dados desnecessários ou excessivos.</li>
          <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado.</li>
          <li><strong>Informação:</strong> Sobre com quem compartilhamos seus dados.</li>
          <li><strong>Revogação:</strong> Do consentimento a qualquer momento (para casos onde o consentimento foi a base utilizada).</li>
        </ul>
      </section>

      <section>
        <h2>5. Como Exercer Seus Direitos</h2>
        <p>Para exercer qualquer dos direitos acima, você pode:</p>
        <ul>
          <li>Acessar as configurações de privacidade na sua conta.</li>
          <li>Enviar solicitação para o e-mail do nosso DPO.</li>
        </ul>
        <p>
          Responderemos às solicitações em até 15 dias, conforme determina a legislação. Se você for
          um funcionário ou cliente final de um usuário do Puncto, recomendamos contatar primeiramente
          o estabelecimento (Controlador), mas estaremos à disposição para auxiliar.
        </p>
      </section>

      <section>
        <h2>6. Encarregado de Proteção de Dados (DPO)</h2>
        <p>Nomeamos um Encarregado de Proteção de Dados para atuar como canal de comunicação com os titulares e com a ANPD.</p>
        <div className="legal-contact">
          <p>Dúvidas sobre proteção de dados?</p>
          <p>Entre em contato com nosso Encarregado de Dados (DPO):</p>
          <a href="mailto:privacidade@puncto.com.br" className="legal-contact-email">
            suporte@puncto.com.br
          </a>
        </div>
      </section>

      <section>
        <h2>7. Medidas de Segurança</h2>
        <p>Implementamos medidas técnicas e administrativas de ponta para proteger os dados pessoais:</p>
        <ul>
          <li>Criptografia de dados em trânsito (TLS) e em repouso.</li>
          <li>Controle de acesso restrito baseado em funções (RBAC).</li>
          <li>Autenticação forte e gestão de sessões segura.</li>
          <li>Registros de auditoria (logs) de atividades críticas.</li>
          <li>Backups regulares e plano de recuperação de desastres.</li>
        </ul>
      </section>

      <section>
        <h2>8. Transferência Internacional</h2>
        <p>
          Quando necessário transferir dados para fora do Brasil (ex: servidores em nuvem), utilizamos
          cláusulas contratuais padrão ou transferimos para países com nível adequado de proteção
          reconhecido pela autoridade brasileira.
        </p>
      </section>

      <section>
        <h2>9. Incidentes de Segurança</h2>
        <p>
          Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares,
          comunicaremos a ANPD e os titulares afetados em prazo razoável, tomando todas as medidas para
          mitigar os efeitos.
        </p>
      </section>

      <div className="legal-highlight">
        <h3>10. Guia Rápido para Usuários Puncto (Controladores)</h3>
        <p>Se você usa o Puncto para gerenciar sua empresa, <strong>você é o Controlador</strong> dos dados que insere. Recomendamos:</p>
        <ul>
          <li><strong>Transparência:</strong> Informe seus clientes e colaboradores que você utiliza o Puncto como sistema de gestão.</li>
          <li><strong>Base Legal Correta (RH):</strong> Para o registro de ponto de funcionários, a base legal geralmente é a <em>Execução de Contrato</em> ou <em>Obrigação Legal</em>, não sendo necessário pedir &quot;consentimento&quot; para o registro da jornada.</li>
          <li><strong>Base Legal Correta (Clientes):</strong> Para enviar marketing aos seus clientes finais, certifique-se de ter o consentimento deles ou uma relação prévia que justifique o legítimo interesse.</li>
          <li><strong>Direitos:</strong> Utilize as ferramentas de exportação de dados do Puncto para atender solicitações de seus clientes quando necessário.</li>
        </ul>
      </div>

      <section>
        <h2>11. Atualizações</h2>
        <p>
          Esta página pode ser atualizada para refletir mudanças em nossas práticas ou na legislação.
          Recomendamos revisá-la periodicamente.
        </p>
      </section>
    </LegalPageLayout>
  );
}
