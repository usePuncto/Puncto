'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import FAQAccordion from '@/components/marketing/FAQAccordion';
import CTASection from '@/components/marketing/CTASection';
import ServiceTermsSection from '@/components/marketing/ServiceTermsSection';

const commercialFAQ = [
  {
    question: 'Por que os valores não aparecem no site?',
    answer:
      'Porque cada empresa tem uma operação diferente. Preferimos entender o que você precisa organizar e só então apresentar uma proposta com valores sob medida — após o diagnóstico gratuito.',
  },
  {
    question: 'Como funciona o modelo da Puncto?',
    answer:
      'A Puncto ajuda a centralizar a gestão da empresa em um único sistema. Partimos de áreas já desenvolvidas (agenda, clientes, financeiro, estoque, equipe e outras) e fazemos ajustes para caber na rotina do seu negócio.',
  },
  {
    question: 'O sistema pode ser ajustado à minha empresa?',
    answer:
      'Sim. A ideia é que o sistema se adapte ao seu jeito de trabalhar — e não o contrário. Ajustes necessários para adequar a rotina fazem parte do acompanhamento; demandas maiores são alinhadas em proposta.',
  },
  {
    question: 'Como funciona o suporte?',
    answer:
      'O suporte é feito por e-mail, WhatsApp e telefone, em dias úteis das 09h às 18h, com prazo de resposta de até 3 horas úteis conforme a urgência.',
  },
  {
    question: 'Atualizações têm custo extra?',
    answer:
      'Não. Atualizações do sistema, correções e melhorias de segurança fazem parte do acompanhamento, sem cobrança avulsa.',
  },
  {
    question: 'Posso usar em mais de uma unidade?',
    answer:
      'Sim. A Puncto pode atender operações com mais de uma unidade ou franquia, com visão consolidada ou por localidade. Detalhamos isso no diagnóstico.',
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-primary mb-4">Investimento sob medida</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Sem planos genéricos — proposta após o diagnóstico
            </h1>
            <p className="body-lg mb-8">
              Não publicamos tabelas de preço no site. Agende um diagnóstico
              gratuito, veja o sistema na realidade da sua empresa e receba
              valores alinhados ao que você realmente precisa.
            </p>
            <Link href="/demo" className="btn-primary btn-lg">
              Agendar diagnóstico gratuito
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Como chegamos aos valores
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              O caminho comercial é simples e transparente.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Pré-diagnóstico',
                description:
                  'Você conta o segmento, o tamanho da equipe e o que quer organizar ou melhorar.',
              },
              {
                step: '2',
                title: 'Demonstração personalizada',
                description:
                  'Mostramos o sistema próximo da sua rotina, com as áreas que fazem sentido para o seu negócio.',
              },
              {
                step: '3',
                title: 'Proposta sob medida',
                description:
                  'Só depois apresentamos valores e condições — alinhados ao que foi discutido juntos.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center"
              >
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="heading-sm text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <h2 className="heading-lg text-slate-900 mb-4">
                O que entra na conversa
              </h2>
              <p className="body-lg mb-6">
                No diagnóstico, alinhamos o que sua empresa precisa organizar
                hoje — e o que pode evoluir depois.
              </p>
              <ul className="space-y-3">
                {[
                  'Agenda, clientes, vendas e atendimento',
                  'Financeiro, estoque e indicadores',
                  'Equipe, ponto e rotinas do dia a dia',
                  'Ajustes para caber na sua forma de trabalhar',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-soft border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Pronto para conversar?
              </h3>
              <p className="text-slate-600 mb-6">
                Leva poucos minutos preencher o formulário. Em seguida,
                agendamos o diagnóstico gratuito.
              </p>
              <Link href="/demo" className="btn-primary w-full justify-center">
                Ir para o formulário
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white border-t border-slate-100">
        <div className="container-marketing">
          <ServiceTermsSection />
        </div>
      </section>

      <section id="faq" className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Dúvidas sobre investimento
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Respostas objetivas sobre como trabalhamos valores e atendimento.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <FAQAccordion items={commercialFAQ} />
          </div>
        </div>
      </section>

      <CTASection
        title="Veja a Puncto na realidade da sua empresa"
        description="Agende o diagnóstico gratuito e receba uma proposta personalizada depois da demonstração."
        primaryCTA={{ text: 'Agendar diagnóstico gratuito', href: '/demo' }}
        secondaryCTA={{ text: 'Falar conosco', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
