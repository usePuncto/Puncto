'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

import CTASection from '@/components/marketing/CTASection';
import StatsCounter from '@/components/marketing/StatsCounter';

const teamMembers = [
  {
    name: 'Vinícius Quadros',
    role: 'Co-fundador & CEO',
    bio: 'Engenheiro de Software, Vinícius atua como sócio e CEO na Puncto, onde está diretamente envolvido no desenvolvimento do sistema. Sua missão é garantir a entrega do que existe de melhor no mercado, cuidando não só da parte técnica e do código, mas também auxiliando em todas as decisões estratégicas que moldam o produto.',
    image: '/team/fotoVinicius.png',
  },
  {
    name: 'Beatriz Marques',
    role: 'Co-fundadora & COO',
    bio: 'Como sócia e COO, Beatriz une sua visão de empresária à sua expertise técnica como Engenheira de Software para guiar as operações da Puncto. Sua paixão pela tecnologia a impulsiona a traduzir desafios complexos de mercado em soluções escaláveis, garantindo que o sistema seja não apenas robusto no back-end, mas incrivelmente intuitivo para o usuário final.',
    image: '/team/fotoBeatriz.png',
  },
];

const values = [
  {
    title: 'Modularidade',
    description:
      'Acreditamos que você só deve pagar pelo que usa. Nossas ferramentas se encaixam como blocos para montar a operação perfeita.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Transparência Absoluta',
    description:
      'Sem letras miúdas. Regras claras de limites de planos, cotas visíveis e modelo pay-as-you-go sem surpresas na fatura.',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    title: 'Simplicidade Operacional',
    description:
      'Do escritório à bancada da fábrica, nossas telas são desenhadas para serem entendidas em segundos, sem necessidade de manuais complexos.',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  {
    title: 'Inovação Orientada a Resultados',
    description:
      'Não criamos funcionalidades apenas por criar. Desenvolvemos soluções focadas em reduzir desperdício, cortar retrabalho e aumentar suas vendas.',
    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  },
];

const milestones = [
  { year: '2025', title: 'Fundação', description: 'Puncto nasce para simplificar a gestão de negócios de serviços no Brasil' },
  { year: '2026', title: 'Lançamento', description: 'Primeira versão da plataforma, um ecossistema modular completo' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-primary mb-4">Sobre nós</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Simplificando a gestão de negócios no Brasil
            </h1>
            <p className="body-lg">
              Nascemos da frustração de empreendedores que perdiam tempo com
              sistemas complicados. Nossa missão é trazer tecnologia de ponta para
              pequenos, médios e grandes negócios de forma simples e acessível.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="heading-lg text-slate-900 mb-6">Nossa história</h2>
              <div className="space-y-4 text-slate-600">
                <p>
                  A Puncto nasceu em 2026 com uma observação simples: empreendedores de todos 
                  os tamanhos perdiam horas preciosas com burocracia, agendas de papel e sistemas 
                  engessados. O mercado forçava o dono do negócio a se adaptar ao software. Nós 
                  decidimos inverter essa lógica.
                </p>
                <p>
                  Construímos uma plataforma verdadeiramente modular. Para pequenos prestadores 
                  de serviço e comércios locais, oferecemos agendamento, vitrine digital e controle 
                  financeiro de forma intuitiva. Conforme crescemos, entendemos que clínicas, 
                  escritórios corporativos e indústrias também precisavam dessa mesma facilidade, 
                  mas com governança avançada, módulos de produção (KDS) e automações potentes.
                </p>
                <p>
                  Hoje, a Puncto é o motor que impulsiona operações de ponta a ponta. Seja reduzindo 
                  filas no varejo ou traduzindo ordens de serviço no chão de fábrica, nossa missão é 
                  democratizar a tecnologia de alto nível com transparência e um modelo justo de pagamento.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl aspect-square flex items-center justify-center"
            >
              <div className="text-center text-slate-400">
                <svg
                  className="w-24 h-24 mx-auto mb-4 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <p className="font-medium">Foto</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">Nossos valores</h2>
            <p className="body-lg max-w-2xl mx-auto">
              Os princípios que guiam tudo o que fazemos
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-soft border border-slate-100"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={value.icon}
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-slate-600 text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">Nossa jornada</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary-200 transform md:-translate-x-1/2" />

              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative flex items-center mb-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-primary-500 rounded-full transform -translate-x-1/2 z-10 ring-4 ring-white" />

                  {/* Content */}
                  <div
                    className={`ml-12 md:ml-0 md:w-1/2 ${
                      index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'
                    }`}
                  >
                    <span className="badge-primary mb-2">{milestone.year}</span>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {milestone.title}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {milestone.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">Nosso time</h2>
            <p className="body-lg max-w-2xl mx-auto">
              Uma equipe apaixonada por resolver problemas reais de empreendedores
              brasileiros.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-soft border border-slate-100 text-center"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6 ring-4 ring-primary-100">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {member.name}
                </h3>
                <p className="text-primary-600 font-medium mb-4">
                  {member.role}
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection variant="gradient" />
    </>
  );
}
