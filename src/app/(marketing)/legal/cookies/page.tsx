import { Metadata } from 'next';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Como o Puncto utiliza cookies e tecnologias similares.',
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Política de Cookies"
      updated="02 de Fevereiro de 2026"
      description="Como utilizamos cookies e tecnologias similares para segurança, preferências e melhorias no serviço."
    >
      <section>
        <h2>1. O que são Cookies?</h2>
        <p>
          Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou celular)
          quando você visita um site. Eles são amplamente utilizados para fazer sites funcionarem de forma
          mais eficiente, bem como fornecer informações aos proprietários do site e garantir a segurança das transações.
        </p>
      </section>

      <section>
        <h2>2. Como Usamos Cookies</h2>
        <p>A Puncto utiliza cookies para:</p>
        <ul>
          <li>Manter você conectado à sua conta com segurança (Sessão).</li>
          <li>Processar pagamentos e prevenir fraudes financeiras (Stripe).</li>
          <li>Garantir a integridade do registro de ponto dos funcionários (Módulo RH).</li>
          <li>Lembrar suas preferências (idioma, tema, configurações).</li>
          <li>Analisar como você usa nosso serviço para melhorias contínuas.</li>
        </ul>
      </section>

      <section>
        <h2>3. Tipos de Cookies que Usamos</h2>

        <h3>3.1 Cookies Essenciais (Obrigatórios)</h3>
        <p>
          Necessários para o funcionamento básico e segurança da plataforma. Sem eles, recursos como
          login, pagamentos e registro de ponto não funcionam. <strong>Estes cookies não podem ser desativados.</strong>
        </p>

        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>__session</code></td>
                <td>Autenticação do usuário e segurança do login</td>
                <td>Sessão</td>
              </tr>
              <tr>
                <td><code>csrf_token</code></td>
                <td>Proteção contra ataques de falsificação (CSRF)</td>
                <td>Sessão</td>
              </tr>
              <tr>
                <td><code>__stripe_mid / __stripe_sid</code></td>
                <td>Prevenção de fraude em pagamentos (Stripe)</td>
                <td>1 ano / 30 min</td>
              </tr>
              <tr>
                <td><code>cookie_consent</code></td>
                <td>Memoriza suas preferências de cookies</td>
                <td>1 ano</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>3.2 Cookies de Desempenho (Analíticos)</h3>
        <p>
          Coletam informações anônimas sobre como você usa o site, como páginas visitadas e erros encontrados.
        </p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_ga</code></td>
                <td>Google Analytics - Identificação de usuário único</td>
                <td>2 anos</td>
              </tr>
              <tr>
                <td><code>_gid</code></td>
                <td>Google Analytics - Distinção de sessão</td>
                <td>24 horas</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>3.3 Cookies de Funcionalidade</h3>
        <p>Permitem que o site lembre suas escolhas para melhorar a experiência.</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>locale</code></td>
                <td>Preferência de idioma selecionado</td>
                <td>1 ano</td>
              </tr>
              <tr>
                <td><code>theme</code></td>
                <td>Preferência de tema visual (Claro/Escuro)</td>
                <td>1 ano</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>3.4 Cookies de Marketing</h3>
        <p>
          Usados para rastrear visitantes e exibir anúncios relevantes. Só são ativados com seu consentimento explícito.
        </p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_fbp</code></td>
                <td>Facebook Pixel - Rastreamento de conversão</td>
                <td>3 meses</td>
              </tr>
              <tr>
                <td><code>_gcl_au</code></td>
                <td>Google Ads - Eficácia de publicidade</td>
                <td>3 meses</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>4. Como Gerenciar Cookies</h2>

        <h3>4.1 Nosso Banner de Consentimento</h3>
        <p>
          Ao acessar a Puncto pela primeira vez, você verá nosso banner de gestão de cookies.
          Você pode alterar suas escolhas a qualquer momento acessando as &quot;Configurações de Privacidade&quot;
          no rodapé da plataforma.
        </p>

        <h3>4.2 Configurações do Navegador</h3>
        <p>Você também pode bloquear cookies diretamente no seu navegador, mas alertamos que isso pode impedir o funcionamento da plataforma Puncto.</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/pt-BR/kb/impeça-que-sites-armazenem-cookies-e-dados-no-fi" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
          <li><a href="https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies de Terceiros</h2>
        <p>
          Alguns recursos da Puncto dependem de serviços externos. Recomendamos consultar as políticas destes provedores:
        </p>
        <ul>
          <li><strong>Stripe:</strong> Processamento de pagamentos e segurança (Essencial).</li>
          <li><strong>Google Analytics:</strong> Análise de tráfego.</li>
          <li><strong>Meta (Facebook):</strong> Marketing.</li>
          <li><strong>Intercom:</strong> Chat de suporte ao cliente.</li>
        </ul>
      </section>

      <section>
        <h2>6. Alterações nesta Política</h2>
        <p>
          Podemos atualizar esta Política de Cookies periodicamente. Alterações significativas serão
          comunicadas através de aviso na plataforma ou por e-mail.
        </p>
      </section>

      <div className="legal-contact">
        <p>Dúvidas sobre os cookies?</p>
        <p>Entre em contato com nosso DPO:</p>
        <a href="mailto:privacidade@puncto.com.br" className="legal-contact-email">
          suporte@puncto.com.br
        </a>
      </div>
    </LegalPageLayout>
  );
}
