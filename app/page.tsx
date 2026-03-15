import Link from 'next/link'
import { Zap, Sparkles, TrendingUp, BarChart2, ArrowRight, AlignLeft } from 'lucide-react'

const features = [
  {
    title: 'Generate with AI',
    description:
      'Get 3 tweet options instantly from Claude or GPT-4o, tailored to trending topics and your personal brand.',
    icon: Sparkles,
  },
  {
    title: 'Ride the trends',
    description:
      "See what's trending in Indonesia and worldwide. Post relevant content while the topic is hot.",
    icon: TrendingUp,
  },
  {
    title: 'AI thread creator',
    description:
      'Turn any topic into a full Twitter thread. AI writes the hook, body, and CTA — you just review and post.',
    icon: AlignLeft,
  },
  {
    title: 'Post & track',
    description:
      'Publish directly from the dashboard. Track impressions, likes, replies, and retweets in one place.',
    icon: BarChart2,
  },
]

const steps = [
  {
    title: 'Create your account',
    description: 'Sign up with just your email.',
  },
  {
    title: 'Connect Twitter',
    description: 'Add your X API credentials once.',
  },
  {
    title: 'Generate content',
    description: 'Pick a trend, choose an AI model, get tweet or thread options.',
  },
  {
    title: 'Post & grow',
    description: 'Preview, edit if needed, post with one click.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur">
        <div className="app-container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300">
              <Zap size={18} />
            </div>
            <span className="text-sm font-semibold tracking-tight">monetize-fan</span>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main>
        <section className="app-container grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              AI-Powered Twitter Management
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Grow & monetize your Twitter with AI
            </h1>
            <p className="text-sm text-white/70 sm:text-base">
              Generate trending content, manage your profile, and track performance — all in one dashboard.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                See how it works
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent_60%)] blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-[#111111] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Generate
                </div>
                <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                  Claude + GPT-4o
                </span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs text-white/60">Trending topic</p>
                  <p className="mt-2 text-sm font-semibold text-white">#AI2026</p>
                </div>
                <div className="grid gap-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>Option {item}</span>
                        <span className="text-indigo-300">Hooked</span>
                      </div>
                      <div className="mt-2 h-2 w-4/5 rounded-full bg-white/10" />
                      <div className="mt-2 h-2 w-3/5 rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-100">
                  <span>Ready to post in seconds</span>
                  <span className="font-semibold">280 chars</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="app-container py-16 md:py-20">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200/70">
              Everything you need
            </p>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              One dashboard for your entire Twitter workflow
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-[#111111] p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-container py-16 md:py-20">
          <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-6 md:p-10">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Thread example
              </span>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                From topic to thread in seconds
              </h2>
              <p className="text-sm text-white/70 sm:text-base">
                Just type a topic — AI handles the writing, formatting, and structure.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                      Topic
                    </p>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80">
                      AI tools for Indonesian startup founders
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                      Model
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200">
                        Claude Sonnet
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60">
                        GPT-4o Mini
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Generate thread
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-semibold text-indigo-100">
                        rf
                      </div>
                      <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80">
                        <span className="absolute right-3 top-3 rounded-full bg-purple-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-200">
                          Hook
                        </span>
                        5 AI tools yang wajib dicoba founder Indonesia di 2026 — dan hampir semuanya
                        gratis. 🧵
                      </div>
                    </div>
                    <div className="ml-4 h-6 w-px bg-white/10" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-semibold text-indigo-100">
                        rf
                      </div>
                      <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80">
                        <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                          2 / 6
                        </span>
                        1. Claude — bukan cuma chatbot. Bisa bantu draft investor deck, analisis
                        market, sampai nulis cold email. (2/6)
                      </div>
                    </div>
                    <div className="ml-4 h-6 w-px bg-white/10" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-semibold text-indigo-100">
                        rf
                      </div>
                      <div className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <div className="h-2 w-4/5 rounded-full bg-white/10" />
                        <div className="mt-2 h-2 w-3/5 rounded-full bg-white/10" />
                        <div className="mt-2 h-2 w-2/5 rounded-full bg-white/10" />
                      </div>
                    </div>
                    <div className="ml-4 h-6 w-px bg-white/10" />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-semibold text-indigo-100">
                      rf
                    </div>
                    <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80">
                      <span className="absolute right-3 top-3 rounded-full bg-indigo-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                        CTA
                      </span>
                      AI tool mana yang udah kamu coba? Drop di reply! #AI #StartupIndonesia
                      #BuildInPublic
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="app-container py-16 md:py-20">
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Up and running in minutes
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/70">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="app-container py-16 md:py-20">
          <div className="rounded-3xl border border-indigo-500/30 bg-[#111111] p-8 md:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Ready to grow your Twitter?</h2>
                <p className="mt-2 text-sm text-white/70">
                  Join creators and builders already using monetize-fan.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="app-container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300">
                <Zap size={16} />
              </div>
              <span className="text-sm font-semibold">monetize-fan</span>
            </div>
            <p className="text-xs text-white/60">AI-powered Twitter management</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <span>© 2026 monetize-fan</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
