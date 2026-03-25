/**
 * Detailed feature descriptions per plan and industry.
 * Used on industry pages to expand the plan cards with full explanations.
 */
export type FeatureDetail = { title: string; description: string };
export type PlanFeatureDetails = { intro: string; features: FeatureDetail[] };
export type AddOnContent = { title: string; description: string };

export const addOnContentByIndustry: Record<string, AddOnContent> = {
  servicos: {
    title: '🧩 Personalize a Puncto do seu jeito',
    description:
      'Sabemos que cada negócio é único. Por isso, nossa plataforma é modular. Mesmo sendo um prestador de serviços, se você decidir vender lanches na recepção ou precisar de um ponto eletrônico para funcionários, você pode ativar essas funcionalidades extras (Add-ons) individualmente, pagando apenas pelo que usar, sem precisar migrar para um plano mais caro ou mudar de sistema.',
  },
  varejo: {
    title: '🧩 O melhor dos dois mundos',
    description:
      'Seu negócio é híbrido? Sem problemas. Se você tem uma loja de roupas que faz ajustes (serviço) ou uma oficina que vende peças (varejo), você não precisa contratar dois sistemas. Ative funcionalidades de Serviços (como agendamento online ou gestão de equipes) dentro do seu plano de Varejo através dos nossos Add-ons, pagando apenas pelo que faz sentido para sua operação.',
  },
  empresas: {
    title: '⚙️ Personalize sua Indústria',
    description:
      'Sabemos que cada fábrica tem seu processo. Precisa de um CRM para sua equipe de vendas externas ou de uma gestão de entregas (Logística)? Você pode ativar módulos de outros segmentos (como o CRM do Plano Pro de Serviços) através de add-ons, montando o ERP perfeito para sua operação híbrida.',
  },
  saude: {
    title: '🧩 Sua clínica, suas regras',
    description:
      'Precisa de algo além do padrão? Adicione módulos complementares à sua gestão de saúde. Se a sua clínica cresceu, você pode ativar o controle de Ponto Eletrônico para a equipe da recepção ou a Gestão de Contratos para parcerias com convênios, através de nossos Add-ons pagos, mantendo tudo integrado em um único sistema.',
  },
  corporativo: {
    title: '🧩 Um sistema que se molda à sua empresa',
    description:
      'Seu escritório tem demandas específicas? Adicione funcionalidades de outros segmentos de acordo com a sua necessidade. Se precisar gerenciar a agenda de salas de reunião, controlar o estoque de materiais de escritório ou adicionar um CRM para o time de vendas, você pode habilitar essas ferramentas como add-ons pagos, unificando toda a sua operação corporativa no Puncto.',
  },
};

export const featureDetailsByIndustry: Record<
  string,
  Record<string, PlanFeatureDetails>
> = {
  servicos: {
    gratis: {
      intro: 'O essencial para começar a se organizar e profissionalizar o seu atendimento.',
      features: [
        {
          title: '📅 Agendamento Online Ilimitado (Link na Bio)',
          description:
            'Chega de trocar dezenas de mensagens para marcar um horário. Você terá um link exclusivo e personalizado para colocar na bio do Instagram ou enviar no WhatsApp. Seus clientes visualizam seus horários livres e agendam sozinhos, 24 horas por dia, sem que você precise parar o que está fazendo. O horário fica reservado no sistema, mas a aprovação final é sua. Você recebe o pedido e confirma manualmente com o cliente (enviando uma mensagem no WhatsApp ou e-mail pessoal) para garantir o atendimento.',
        },
        {
          title: '📇 Cadastro e Histórico de Clientes',
          description:
            'Abandone o caderninho. Todo cliente que agendar com você será salvo automaticamente em uma base de dados segura. Com o tempo, você constrói um histórico detalhado: saiba exatamente quando foi a última visita, quais serviços ele mais consome e tenha todos os contatos organizados em um só lugar.',
        },
      ],
    },
    starter: {
      intro: 'Para quem quer reduzir furos na agenda e começar a ver a cor do dinheiro.',
      features: [
        {
          title: '🔔 Lembretes de Agendamento (E-mail Automático + WhatsApp Manual)',
          description:
            'Reduza drasticamente o número de clientes que esquecem o horário (o famoso no-show). Por E-mail: O sistema envia confirmações e lembretes automáticos para o e-mail do cliente sem você precisar fazer nada. Por WhatsApp: Geramos uma mensagem pronta e personalizada com um clique. Você só precisa apertar "enviar" para confirmar o horário com seu cliente pelo Zap, mantendo aquele toque pessoal.',
        },
        {
          title: '📊 Relatório Financeiro Básico',
          description:
            'Pare de misturar as contas pessoais com as da empresa. Tenha uma visão clara do quanto entrou no caixa no dia, na semana ou no mês. Saiba quais serviços estão rendendo mais e tenha controle sobre o seu faturamento bruto de forma simples e visual.',
        },
      ],
    },
    growth: {
      intro: 'Automação total para quem não tem tempo a perder e quer vender mais.',
      features: [
        {
          title: '💬 WhatsApp Automático (Sem intervenção manual)',
          description:
            'A verdadeira virada de chave na sua produtividade. A Puncto se conecta ao seu WhatsApp e envia os lembretes de horário e confirmações de agendamento automaticamente. Você não precisa nem encostar no celular; o sistema trabalha como sua secretária virtual enquanto você atende.',
        },
        {
          title: '⏳ Lista de Espera Inteligente',
          description:
            'Agenda lotada? Não perca o cliente. Se um horário vago surgir (alguém desmarcou), o sistema ajuda a preencher essa lacuna com clientes que demonstraram interesse naquele dia, garantindo que sua agenda esteja sempre otimizada e cheia.',
        },
        {
          title: '🎁 CRM (Aniversário e Retenção)',
          description:
            'Fidelize quem já é cliente. O sistema avisa os aniversariantes do mês para você enviar mimos e identifica clientes "sumidos" (que não agendam há x dias), permitindo que você crie campanhas de recuperação para trazê-los de volta.',
        },
        {
          title: '📝 Emissão de NFS-e',
          description:
            'Fique em dia com a fiscalização sem dor de cabeça. O sistema emite suas Notas Fiscais de Serviço Eletrônicas de forma integrada aos seus atendimentos e pagamentos, economizando horas de burocracia no site da prefeitura.',
        },
      ],
    },
    pro: {
      intro: 'Gestão empresarial completa para clínicas, salões e estúdios com equipe.',
      features: [
        {
          title: '👥 Multi-agendas (Gestão de Equipes)',
          description:
            'Centralize a gestão do seu time. Cada profissional tem sua própria agenda e horários, mas você (gestora) tem uma visão geral de tudo. Configure comissões, horários de trabalho individuais e permita que o cliente escolha com quem quer ser atendido.',
        },
        {
          title: '📈 DRE Gerencial + Metas',
          description:
            'Uma visão financeira de gente grande. Além do faturamento, acompanhe seus custos, despesas e lucro líquido através de um DRE (Demonstrativo do Resultado do Exercício) simplificado. Defina metas de faturamento para o mês e acompanhe o progresso da sua empresa em tempo real.',
        },
        {
          title: '⏰ Ponto Eletrônico',
          description:
            'Controle a jornada da sua equipe. Seus funcionários registram entrada, saída e pausas diretamente no sistema. Simples para eles e seguro para você, garantindo o controle de horas trabalhadas de forma transparente.',
        },
        {
          title: '📦 Controle de Estoque Completo',
          description:
            'Nunca mais seja pego de surpresa pela falta de produtos. Controle a entrada e saída de insumos (shampoos, cremes, materiais descartáveis) e produtos de revenda. O sistema dá baixa automática conforme o uso nos serviços ou vendas.',
        },
      ],
    },
  },
  varejo: {
    gratis: {
      intro: 'Sua vitrine online para começar a vender sem barreiras.',
      features: [
        {
          title: '🛍️ Vitrine Digital (Link na Bio)',
          description:
            'Transforme seu Instagram em uma loja. Crie um catálogo online simples e bonito com seus produtos, fotos e preços. Você recebe um link exclusivo para divulgar onde quiser. O cliente navega, escolhe o que gosta e entra em contato com você já sabendo o que quer.',
        },
        {
          title: '📇 Cadastro e Histórico de Clientes',
          description:
            'Conheça quem compra de você. Registre cada venda e crie um banco de dados valioso. Saiba quem são seus clientes mais fiéis, o que eles costumam comprar e tenha o contato deles salvo para futuras promoções ou lançamentos.',
        },
      ],
    },
    starter: {
      intro: 'Organização básica para quem cansou de contar produtos no olho.',
      features: [
        {
          title: '📦 Controle de Estoque Simples',
          description:
            'Evite vender o que você não tem. Registre a entrada e saída de produtos de forma rápida. O sistema desconta automaticamente do seu estoque a cada venda registrada, avisando quando um item está acabando para você repor a tempo.',
        },
        {
          title: '📊 Relatório Financeiro',
          description:
            'Feche o caixa sem sofrimento. Acompanhe suas vendas diárias, semanais e mensais. Saiba exatamente quanto entrou de dinheiro e quais foram os produtos campeões de venda no período, eliminando as planilhas manuais confusas.',
        },
      ],
    },
    growth: {
      intro: 'Venda mais rápido, receba na hora e automatize o atendimento.',
      features: [
        {
          title: '📱 Cardápio/Catálogo QR Code + Pedidos',
          description:
            'Agilize o atendimento no balcão ou na mesa. O cliente escaneia um QR Code, acessa seu cardápio ou catálogo digital, e faz o pedido direto pelo celular dele. O pedido cai pronto para você preparar ou separar, reduzindo erros de anotação e filas.',
        },
        {
          title: '💬 WhatsApp Automático',
          description:
            'Mantenha seu cliente informado sem esforço. A Puncto envia mensagens automáticas sobre o status do pedido ("Recebemos seu pedido", "Saiu para entrega") direto para o WhatsApp do cliente. Isso passa confiança e profissionalismo sem você perder tempo digitando.',
        },
        {
          title: '💳 Pagamentos Integrados (PIX e Cartão)',
          description:
            'Receba com segurança e agilidade. Aceite pagamentos via PIX ou Cartão de Crédito diretamente na plataforma ou no momento do pedido via QR Code. O sistema já dá baixa financeira automaticamente, facilitando a conciliação no final do dia.',
        },
        {
          title: '🧾 Emissão de NFC-e/NFE',
          description:
            'Regularize suas vendas em segundos. Emita a Nota Fiscal de Consumidor Eletrônica (NFC-e) ou a Nota Fiscal Eletrônica (NF-e) com poucos cliques, integrada à venda, garantindo que sua loja esteja sempre em dia com as obrigações fiscais.',
        },
      ],
    },
    pro: {
      intro: 'Gestão robusta para lojas que querem escalar e controlar cada centavo.',
      features: [
        {
          title: '🏭 Multi-estoque/Depósitos',
          description:
            'Gerencie estoques em locais diferentes sem confusão. Se você tem uma loja física e um depósito, ou múltiplas filiais, o sistema permite controlar o saldo de produtos em cada local separadamente, facilitando transferências e a logística interna.',
        },
        {
          title: '⏰ Ponto Eletrônico',
          description:
            'Controle a jornada da sua equipe. Seus funcionários registram entrada, saída e pausas diretamente no sistema. Simples para eles e seguro para você, garantindo o controle de horas trabalhadas de forma transparente.',
        },
        {
          title: '📈 DRE Gerencial + Metas',
          description:
            'Visão de lucro real. Vá além do faturamento e veja o resultado líquido da sua operação (DRE), descontando custos e despesas. Estabeleça metas de vendas para sua equipe e acompanhe o desempenho em tempo real para tomar decisões estratégicas.',
        },
        {
          title: '📦 Controle de Estoque Completo',
          description:
            'Domine seu inventário. Tenha acesso a recursos avançados como ficha técnica de produtos, gestão de fornecedores, cálculo de custo médio e histórico detalhado de movimentações (quem tirou o que e quando), evitando perdas e furtos.',
        },
      ],
    },
  },
  empresas: {
    gratis: {
      intro: 'Controle básico para sair do papel e organizar a casa.',
      features: [
        {
          title: '📊 Relatórios de Produção Simples',
          description:
            'Tenha uma visão geral do que está acontecendo. Saiba quantos produtos foram fabricados no dia e acompanhe o volume básico da sua produção para entender seu ritmo de trabalho, sem complicação.',
        },
        {
          title: '👥 Cadastro de Funcionários',
          description:
            'Organize seu time. Mantenha os dados básicos de todos os colaboradores centralizados, facilitando a consulta de informações e o gerenciamento da equipe do chão de fábrica.',
        },
      ],
    },
    starter: {
      intro: 'O primeiro passo para a profissionalização do chão de fábrica.',
      features: [
        {
          title: '📦 Controle de Estoque de Insumos',
          description:
            'Pare de parar a produção por falta de material. Registre a entrada de matéria-prima e a saída de produtos acabados. O sistema ajuda você a manter o inventário atualizado e evitar compras de emergência.',
        },
        {
          title: '⏰ Ponto Eletrônico Digital',
          description:
            'Adeus cartão de ponto manual. Seus funcionários registram entrada, saída e pausas diretamente no sistema (computador ou tablet). Você ganha segurança jurídica e agilidade no fechamento da folha.',
        },
      ],
    },
    growth: {
      intro: 'Automação administrativa para indústrias em crescimento.',
      features: [
        {
          title: '📄 Ordem de Produção (OP) Automática',
          description:
            'Integração total entre venda e fábrica. Assim que uma venda é fechada, o sistema gera automaticamente a Ordem de Produção com as quantidades e prazos, eliminando o "leva e traz" de papéis entre o escritório e a produção.',
        },
        {
          title: '⚖️ Gestão de Contratos',
          description:
            'Ideal para indústrias que fornecem serviços recorrentes ou B2B. Gerencie contratos de longo prazo, controle vigências, renovações e garanta que o acordado com o cliente esteja sendo cumprido.',
        },
        {
          title: '🏦 Banco de Horas',
          description:
            'Flexibilidade controlada. O sistema calcula automaticamente o saldo de horas extras ou negativas de cada funcionário com base no ponto eletrônico, facilitando a compensação e evitando passivos trabalhistas.',
        },
        {
          title: '🧾 Emissão de NF-e e NFC-e',
          description:
            'Faturamento ágil. Emita suas notas fiscais de venda ou de remessa industrial diretamente pela plataforma, conectada aos dados do pedido, garantindo conformidade fiscal sem redigitação.',
        },
      ],
    },
    pro: {
      intro: 'A revolução do Chão de Fábrica: Qualidade total e Gestão 4.0.',
      features: [
        {
          title: '🖥️ Módulo de Produção (KDS) & Checklists Visuais',
          description:
            'Leve tablets e monitores para a bancada. Substitua as fichas de papel por telas interativas onde o funcionário vê o passo a passo da montagem com fotos e instruções claras. Inclui checklists de qualidade obrigatórios (o funcionário precisa marcar que conferiu a "costura" ou o "acabamento" para avançar), garantindo padronização total.',
        },
        {
          title: '🏭 Multi-estoque e Depósitos',
          description:
            'Gestão logística avançada. Controle estoques em múltiplos locais (matriz, filiais, depósitos externos) ou segregue o estoque por estágios (matéria-prima, produto em elaboração, produto acabado), com rastreabilidade total de movimentações.',
        },
        {
          title: '🔗 Integração API e Relatório Financeiro Completo',
          description:
            'Sua fábrica conectada. Integre a Puncto com outros sistemas (ERPs contábeis, e-commerce) via API. Além disso, tenha acesso ao DRE Gerencial para analisar custos de produção, margem de contribuição real e lucratividade por produto.',
        },
      ],
    },
  },
  saude: {
    gratis: {
      intro: 'A base para um consultório organizado e um atendimento acolhedor.',
      features: [
        {
          title: '📅 Agendamentos Digitais Ilimitados (Solicitação via Link)',
          description:
            'Facilite o agendamento para seus pacientes. Disponibilize um link exclusivo na bio do Instagram. O paciente visualiza seus horários disponíveis e solicita a consulta. Você recebe o pedido e confirma manualmente, mantendo o controle total da sua agenda antes de aprovar.',
        },
        {
          title: '📇 Cadastro e Histórico de Pacientes',
          description:
            'Dê adeus às fichas de papel. Crie um prontuário digital básico e seguro para cada paciente. Tenha o histórico de consultas, dados de contato e anotações importantes sempre à mão, garantindo um atendimento mais personalizado e eficiente na próxima visita.',
        },
      ],
    },
    starter: {
      intro: 'Reduza as faltas e comece a ter previsibilidade no seu consultório.',
      features: [
        {
          title: '🔔 Lembretes de Consulta (E-mail Automático + WhatsApp Manual)',
          description:
            'Impeça que os seus pacientes esqueçam consulta de forma simples. Por E-mail: O sistema dispara confirmações e lembretes automáticos para o e-mail do paciente. Por WhatsApp: Com um clique, gere uma mensagem pré-configurada para confirmar o horário. Você só precisa apertar "enviar" no seu celular, mantendo uma comunicação próxima com o paciente.',
        },
        {
          title: '📊 Relatório Financeiro',
          description:
            'Tenha clareza sobre a saúde financeira do seu consultório. Acompanhe as entradas diárias ou mensais, separe as finanças pessoais das profissionais e saiba exatamente quais procedimentos ou consultas geram mais receita.',
        },
      ],
    },
    growth: {
      intro: 'Para profissionais com agenda cheia que precisam de uma secretária virtual.',
      features: [
        {
          title: '⏳ Lista de Espera Inteligente',
          description:
            'Surgiu uma emergência ou um paciente desmarcou de última hora? A Puncto avisa rapidamente os pacientes que estavam aguardando um encaixe. Você otimiza seu tempo, não perde a janela de atendimento e ajuda quem precisa ser atendido com urgência.',
        },
        {
          title: '💬 WhatsApp Automático',
          description:
            'Sua recepção rodando no piloto automático. O sistema envia confirmações de agendamento e lembretes de consulta direto para o WhatsApp do paciente, sem que você ou sua secretária precisem interagir manualmente.',
        },
        {
          title: '💳 Pagamentos PIX e Cartão',
          description:
            'Facilite o acerto das consultas e evite constrangimentos. Envie links de pagamento antecipado para garantir a reserva do horário (ótimo para telemedicina) ou receba via PIX e cartão no próprio consultório com baixa automática no sistema.',
        },
        {
          title: '📝 Emissão de NFS-e',
          description:
            'Menos burocracia, mais tempo para os pacientes. Emita suas Notas Fiscais de Serviço Eletrônicas de forma rápida e integrada aos pagamentos, mantendo seu consultório 100% regularizado com a prefeitura sem dor de cabeça.',
        },
      ],
    },
    pro: {
      intro: 'Gestão completa para clínicas com vários especialistas e foco em expansão.',
      features: [
        {
          title: '👥 Multi-agendas (Equipes)',
          description:
            'Centralize a gestão da sua clínica. Administre a agenda de vários profissionais (médicos, dentistas, fisioterapeutas) em um só lugar. Defina horários de atendimento individuais, regras de comissionamento por profissional e permita que a recepção tenha uma visão unificada de todas as salas.',
        },
        {
          title: '📈 DRE Gerencial + Metas',
          description:
            'Visão empresarial da sua clínica. Analise o lucro real descontando os custos fixos (aluguel, recepção) e variáveis (materiais). Defina metas de faturamento mensal e acompanhe o crescimento do seu negócio com dados precisos.',
        },
        {
          title: '🎁 CRM (Aniversário e Retenção)',
          description:
            'Cuide dos seus pacientes mesmo quando eles não estão na clínica. O sistema ajuda a lembrar de aniversariantes e sinaliza pacientes que precisam de retorno (ex: limpeza odontológica a cada 6 meses, check-up anual), facilitando campanhas de rechamada.',
        },
        {
          title: '📦 Controle de Estoque Completo',
          description:
            'Evite o desperdício de insumos caros. Controle a validade e a quantidade de materiais descartáveis, seringas, anestésicos ou produtos de uso contínuo. O sistema dá baixa conforme o uso nos procedimentos e avisa a hora exata de comprar mais.',
        },
      ],
    },
  },
  corporativo: {
    gratis: {
      intro: 'A fundação para um escritório organizado e com a equipe na mesma página.',
      features: [
        {
          title: '📊 Relatórios Simples',
          description:
            'Tenha um panorama da sua operação. Acompanhe métricas básicas do dia a dia do seu escritório para entender o ritmo de trabalho e os primeiros indicadores da sua empresa, sem precisar cruzar dezenas de planilhas.',
        },
        {
          title: '👥 Cadastro de Funcionários',
          description:
            'O primeiro passo para um RH organizado. Mantenha os dados de todos os seus colaboradores, documentações básicas e informações de contato centralizados em um único sistema, facilitando a vida do departamento pessoal.',
        },
      ],
    },
    starter: {
      intro: 'Comunicação profissional e controle de jornada para equipes crescendo.',
      features: [
        {
          title: '📧 Contatos Automáticos (E-mail Automático + WhatsApp Manual)',
          description:
            'Mantenha seus clientes corporativos sempre informados. Por E-mail: Envie atualizações de status, lembretes de vencimento ou comunicados de forma automatizada. Por WhatsApp: Gere mensagens padronizadas com um clique para fazer follow-ups comerciais ou cobrar retornos importantes, agilizando o trabalho da sua equipe de atendimento.',
        },
        {
          title: '⏰ Ponto Eletrônico',
          description:
            'Controle a jornada da sua equipe com segurança, seja no modelo presencial ou home office. Os colaboradores registram entrada, pausas e saída pelo sistema, garantindo conformidade com as leis trabalhistas e facilitando o fechamento da folha no fim do mês.',
        },
      ],
    },
    growth: {
      intro: 'Automação de processos e gestão de RH para empresas que querem escalar.',
      features: [
        {
          title: '⚖️ Gestão de Contratos',
          description:
            'Não perca prazos nem dinheiro. Controle o ciclo de vida dos contratos dos seus clientes B2B. O sistema alerta sobre datas de renovação, reajustes anuais e monitora o status de cada acordo, garantindo que o seu faturamento recorrente esteja seguro.',
        },
        {
          title: '💬 WhatsApp Automático',
          description:
            'Reduza o trabalho manual do seu time comercial e financeiro. Configure o Puncto para enviar alertas automáticos de cobrança, renovação de contratos ou boas-vindas diretamente para o WhatsApp dos seus clientes corporativos.',
        },
        {
          title: '🏦 Banco de Horas',
          description:
            'Simplifique a gestão de tempo extra. O sistema integra com o ponto eletrônico e calcula automaticamente o saldo positivo ou negativo de horas de cada colaborador. Crie regras de compensação claras e evite surpresas com passivos trabalhistas.',
        },
        {
          title: '🧾 Emissão de NFC-e/NFE',
          description:
            'Faturamento ágil e sem erros. Emita suas Notas Fiscais Eletrônicas de forma integrada à sua gestão de vendas e contratos. O sistema automatiza a burocracia, garantindo que sua empresa esteja sempre em dia com o fisco.',
        },
      ],
    },
    pro: {
      intro: 'Governança avançada para diretorias, filiais e operações complexas.',
      features: [
        {
          title: '📈 DRE Gerencial + Metas',
          description:
            'Visão estratégica para a diretoria. Vá muito além do caixa diário: analise o DRE completo do seu negócio, entenda suas despesas fixas e variáveis, e descubra sua verdadeira margem de lucro. Estabeleça metas globais e acompanhe o atingimento em tempo real.',
        },
        {
          title: '🔗 Integração com Outras Plataformas',
          description:
            'O seu escritório sem barreiras. Conecte a Puncto a outras ferramentas que você já usa (como plataformas de marketing, ERPs contábeis robustos ou sistemas de emissão específicos) via API, criando um ecossistema tecnológico integrado.',
        },
        {
          title: '🏢 Centros de Custo',
          description:
            'Saiba exatamente para onde vai o dinheiro. Divida o orçamento e as despesas da sua empresa por departamentos (Ex: Comercial, Marketing, TI, RH). Identifique quais áreas estão dando mais lucro ou onde é necessário otimizar gastos.',
        },
        {
          title: '🗺️ Gestão de Franquia',
          description:
            'Controle um império a partir de uma única tela. Se o seu negócio possui múltiplas filiais ou opera no modelo de franquias, este módulo permite gerenciar unidades separadamente, consolidar resultados e garantir que o padrão da matriz está sendo seguido em toda a rede.',
        },
      ],
    },
  },
};
