
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Planos e Preços | Barber System",
  description:
    "Conheça os planos do Barber System. Uma plataforma completa para gerenciar sua barbearia.",
};

type Plano = {
  nome: string;
  preco: string;
  descricao: string;
  recursos: string[];
  destaque?: boolean;
};

const planos: Plano[] = [
  {
    nome: "Básico",
    preco: "49,90",
    descricao:
      "O essencial para organizar sua barbearia.",
    recursos: [
      "Agenda de agendamentos",
      "Cadastro de clientes",
      "Gerenciamento de serviços",
      "1 profissional",
      "Painel de gerenciamento",
      "Acesso pelo celular ou computador",
    ],
  },
  {
    nome: "Profissional",
    preco: "89,90",
    descricao:
      "Mais controle para quem quer crescer.",
    destaque: true,
    recursos: [
      "Tudo do plano Básico",
      "Até 5 profissionais",
      "Controle financeiro",
      "Planos de cortes",
      "Histórico de atendimentos",
      "Gestão de pagamentos",
      "Relatórios de desempenho",
    ],
  },
  {
    nome: "Premium",
    preco: "149,90",
    descricao:
      "Mais possibilidades para sua operação.",
    recursos: [
      "Tudo do plano Profissional",
      "Profissionais ilimitados",
      "Relatórios avançados",
      "Indicadores de desempenho",
      "Recursos avançados de gestão",
      "Prioridade no suporte",
      "Novas funcionalidades premium",
    ],
  },
];

const vantagens = [
  {
    icone: "📅",
    titulo: "Agenda organizada",
    descricao:
      "Gerencie horários e atendimentos em um único lugar.",
  },
  {
    icone: "👥",
    titulo: "Clientes organizados",
    descricao:
      "Mantenha os dados e o histórico dos seus clientes.",
  },
  {
    icone: "📊",
    titulo: "Controle financeiro",
    descricao:
      "Acompanhe os resultados e tenha mais controle do negócio.",
  },
  {
    icone: "💈",
    titulo: "Gestão de profissionais",
    descricao:
      "Organize sua equipe e os serviços oferecidos.",
  },
];

const perguntas = [
  {
    pergunta: "Como funcionarão os 7 dias grátis?",
    resposta:
      "Nossa proposta é liberar o acesso ao Barber System por 7 dias após a ativação do teste. Durante esse período, a barbearia poderá conhecer os recursos disponíveis sem precisar contratar imediatamente.",
  },
  {
    pergunta: "Preciso cadastrar um cartão para testar?",
    resposta:
      "Estamos planejando oferecer o período de teste sem exigir cartão de crédito. As condições serão confirmadas quando o sistema de assinaturas estiver disponível.",
  },
  {
    pergunta: "O que acontece depois dos 7 dias?",
    resposta:
      "Ao terminar o teste, a barbearia poderá escolher um plano pago. Sem assinatura, o acesso às funcionalidades administrativas ficará limitado, mas os dados serão preservados.",
  },
  {
    pergunta: "Posso trocar de plano depois?",
    resposta:
      "Sim, pretendemos permitir mudanças entre planos. As regras de cobrança proporcional serão definidas na integração de pagamentos.",
  },
  {
    pergunta: "O Barber System funciona no celular?",
    resposta:
      "Sim. A interface foi desenvolvida para ser utilizada em computadores e dispositivos móveis.",
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Logo() {
  return (
    <Link
      href="/precos"
      className="flex items-center gap-3"
      aria-label="Barber System - Planos e preços"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl text-black shadow-lg shadow-amber-500/10">
        ✂
      </div>

      <div>
        <p className="text-lg font-black tracking-tight text-white">
          Barber System
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Gestão inteligente
        </p>
      </div>
    </Link>
  );
}

function CartaoPlano({
  plano,
}: {
  plano: Plano;
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
        plano.destaque
          ? "border-amber-400/70 bg-gradient-to-b from-amber-400/10 via-zinc-900 to-zinc-950 shadow-2xl shadow-amber-500/10"
          : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-600"
      }`}
    >
      {plano.destaque && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-4 py-2 text-xs font-extrabold text-zinc-950 shadow-lg shadow-amber-500/20">
          ★ MAIS ESCOLHIDO
        </div>
      )}

      <div className="mb-7">
        <h3 className="text-xl font-bold text-white">
          {plano.nome}
        </h3>

        <p className="mt-2 min-h-12 text-sm leading-relaxed text-zinc-400">
          {plano.descricao}
        </p>
      </div>

      <div className="mb-7">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-zinc-300">
            R$
          </span>

          <span className="text-5xl font-black tracking-tight text-white">
            {plano.preco}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          Por mês, por barbearia
        </p>
      </div>

      <button
        type="button"
        disabled
        title="A contratação estará disponível em breve."
        className={`mb-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold opacity-70 ${
          plano.destaque
            ? "bg-amber-400 text-zinc-950"
            : "bg-zinc-800 text-white"
        }`}
      >
        Contratação em breve
        <ArrowIcon />
      </button>

      <div className="mb-6 h-px bg-zinc-800" />

      <p className="mb-5 text-sm font-bold text-white">
        O que está previsto:
      </p>

      <ul className="flex flex-1 flex-col gap-4">
        {plano.recursos.map((recurso) => (
          <li
            key={recurso}
            className="flex items-start gap-3 text-sm text-zinc-300"
          >
            <span className="mt-0.5 shrink-0 text-amber-400">
              <CheckIcon />
            </span>

            <span className="leading-relaxed">
              {recurso}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function PrecosPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#09090b] text-white">
      {/* DECORAÇÃO DE FUNDO */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_65%)]"
      />

      {/* CABEÇALHO */}

      <header className="relative z-10 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#recursos"
              className="text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Recursos
            </a>

            <a
              href="#planos"
              className="text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Planos
            </a>

            <a
              href="#perguntas"
              className="text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Dúvidas
            </a>
          </nav>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-3 text-xs font-bold text-white transition hover:border-amber-400 hover:text-amber-400 sm:px-6 sm:text-sm"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}

        <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28">
          <div className="mx-auto mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 sm:text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            7 DIAS GRÁTIS PARA CONHECER O SISTEMA
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-7xl">
            Sua barbearia merece
            <span className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              uma gestão melhor.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            Menos tempo organizando horários e mais tempo
            cuidando do seu negócio. Conheça uma plataforma
            que reúne agenda, clientes, profissionais,
            financeiro e muito mais.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#planos"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-amber-400 px-8 py-4 text-sm font-extrabold text-zinc-950 transition hover:bg-amber-300 sm:w-auto"
            >
              Conhecer os planos
              <ArrowIcon />
            </a>

            <a
              href="#como-funciona"
              className="flex w-full items-center justify-center rounded-xl border border-zinc-700 px-8 py-4 text-sm font-bold text-white transition hover:bg-zinc-900 sm:w-auto"
            >
              Como funciona?
            </a>
          </div>

          <p className="mt-7 text-xs text-zinc-500">
            Período de teste de 7 dias em preparação.
            Nenhuma cobrança é realizada nesta página.
          </p>
        </section>

        {/* RECURSOS */}

        <section
          id="recursos"
          className="border-y border-zinc-800/80 bg-zinc-900/30 py-20 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-12 text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                Tudo em um só lugar
              </p>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Mais organização.
                <span className="block text-zinc-400">
                  Menos complicação.
                </span>
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {vantagens.map((vantagem) => (
                <div
                  key={vantagem.titulo}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 transition hover:border-amber-400/40"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-3xl">
                    {vantagem.icone}
                  </div>

                  <h3 className="mb-3 text-lg font-bold">
                    {vantagem.titulo}
                  </h3>

                  <p className="text-sm leading-7 text-zinc-400">
                    {vantagem.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANOS */}

        <section
          id="planos"
          className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8"
        >
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
              Nossos planos
            </p>

            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Escolha o plano ideal.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-400">
              Comece com 7 dias de teste gratuito e
              descubra como o Barber System pode ajudar
              sua barbearia a crescer.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-5 lg:gap-7">
            {planos.map((plano) => (
              <CartaoPlano
                key={plano.nome}
                plano={plano}
              />
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-6 text-zinc-500">
            Esta página é uma prévia comercial. Os valores,
            os limites e alguns recursos dos planos ainda
            serão definidos antes do lançamento. Nenhuma
            assinatura está disponível para contratação
            neste momento.
          </p>
        </section>

        {/* COMO FUNCIONA */}

        <section
          id="como-funciona"
          className="scroll-mt-20 border-y border-zinc-800 bg-zinc-900/30 py-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-14 text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                Simples e rápido
              </p>

              <h2 className="text-3xl font-black sm:text-4xl">
                Como vai funcionar?
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  numero: "01",
                  titulo: "Crie sua conta",
                  descricao:
                    "Cadastre os dados da sua barbearia para começar.",
                },
                {
                  numero: "02",
                  titulo: "Teste por 7 dias",
                  descricao:
                    "Conheça a plataforma durante o período gratuito.",
                },
                {
                  numero: "03",
                  titulo: "Escolha seu plano",
                  descricao:
                    "Ao final do teste, escolha uma assinatura para continuar.",
                },
              ].map((passo) => (
                <div
                  key={passo.numero}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7"
                >
                  <span className="text-4xl font-black text-amber-400/70">
                    {passo.numero}
                  </span>

                  <h3 className="mt-7 text-xl font-bold">
                    {passo.titulo}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    {passo.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PERGUNTAS FREQUENTES */}

        <section
          id="perguntas"
          className="mx-auto max-w-4xl scroll-mt-20 px-5 py-24 sm:px-8"
        >
          <div className="mb-14 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
              Perguntas frequentes
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              Ficou alguma dúvida?
            </h2>
          </div>

          <div className="space-y-3">
            {perguntas.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 open:border-amber-400/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.pergunta}

                  <span className="text-xl text-amber-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-5 border-t border-zinc-800 pt-5 text-sm leading-7 text-zinc-400">
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CHAMADA FINAL */}

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-zinc-900 to-zinc-950 px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
              O próximo nível da sua barbearia começa aqui.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-400">
              Estamos preparando a experiência de teste
              grátis e contratação do Barber System.
            </p>

            <div className="mt-9 flex justify-center">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl bg-amber-400 px-8 py-4 text-sm font-extrabold text-zinc-950 opacity-70"
              >
                Teste grátis em breve
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* RODAPÉ */}

      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-8 text-center sm:px-8 md:flex-row md:text-left">
          <Logo />

          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Barber System.
            Todos os direitos reservados.
          </p>

          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition hover:text-amber-400"
          >
            Acessar sistema
          </Link>
        </div>
      </footer>
    </div>
  );
}
