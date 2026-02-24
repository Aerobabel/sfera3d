import Link from "next/link";
import { ArrowRight, Building2, Cpu, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { Manrope, Space_Mono, Syne } from "next/font/google";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const trustStats = [
  { value: "42", label: "Active Supplier Halls" },
  { value: "13 ms", label: "Median Input Latency" },
  { value: "4K", label: "Cinematic Stream Quality" },
];

const pillars = [
  {
    icon: Cpu,
    title: "Realtime Unreal Pipeline",
    description:
      "Products are streamed from Unreal Engine with interactive lighting, reflections, and physical scale.",
  },
  {
    icon: Globe2,
    title: "Borderless Attendance",
    description:
      "Open from desktop, tablet, or mobile browser. No installer, no high-end workstation requirement.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Safe",
    description:
      "Session isolation, verified supplier channels, and moderated interactions designed for commercial events.",
  },
];

const journey = [
  {
    step: "01",
    title: "Enter a Live Pavilion",
    description: "Walk curated halls, inspect products, and control the scene with responsive interactions.",
  },
  {
    step: "02",
    title: "Focus on Any Object",
    description: "Use crosshair targeting, open detail cards instantly, and compare specs without context switching.",
  },
  {
    step: "03",
    title: "Connect and Convert",
    description: "Launch supplier chat, request catalogs, and move directly from discovery to qualified lead flow.",
  },
];

export default function LandingPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen overflow-x-clip bg-[#090b10] text-[#f5f1e9] [font-family:var(--font-body)] selection:bg-[#66d9cb] selection:text-[#090b10]`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,233,214,0.24),rgba(93,233,214,0)_70%)] blur-2xl" />
        <div className="drift absolute right-[-6rem] top-48 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(246,186,79,0.24),rgba(246,186,79,0)_72%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_58%),linear-gradient(to_bottom,#090b10_0%,#090b10_55%,#07080c_100%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="fade-up flex items-center gap-3">
            <div className="h-7 w-7 rounded-md border border-[#66d9cb]/50 bg-[#66d9cb]/15 shadow-[0_0_18px_rgba(102,217,203,0.35)]" />
            <span className="text-lg tracking-tight [font-family:var(--font-display)] sm:text-xl">
              3D<span className="text-[#66d9cb]">SFERA</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#d6d1c8] md:flex">
            <a href="#exhibition" className="fade-up delay-1 transition hover:text-white">
              Exhibition
            </a>
            <a href="#marketplace" className="fade-up delay-2 transition hover:text-white">
              Marketplace
            </a>
            <a href="#solutions" className="fade-up delay-3 transition hover:text-white">
              Solutions
            </a>
            <a href="#about" className="fade-up delay-3 transition hover:text-white">
              About
            </a>
          </nav>

          <div className="fade-up delay-2 flex items-center gap-2 sm:gap-3">
            <Link
              href="/supplier/dashboard"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-[#f5f1e9] transition hover:border-white/35 hover:bg-white/10 sm:text-sm"
            >
              Become a Supplier
            </Link>
            <Link
              href="/experience"
              className="rounded-full bg-[#f6ba4f] px-4 py-2 text-xs font-bold tracking-wide text-[#130f07] transition hover:bg-[#ffd084] sm:text-sm"
            >
              Visit Exhibition
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section id="exhibition" className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
          <p className="fade-up [font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.32em] text-[#66d9cb] sm:text-xs">
            Premium Virtual Marketplace
          </p>

          <h1 className="fade-up delay-1 mt-5 max-w-4xl text-4xl leading-[0.95] tracking-tight [font-family:var(--font-display)] sm:text-6xl lg:text-7xl">
            A flagship digital trade floor built to sell presence, not screenshots.
          </h1>

          <p className="fade-up delay-2 mt-7 max-w-2xl text-base leading-relaxed text-[#cdc7bc] sm:text-lg">
            3DSFERA gives buyers a confident way to discover products and gives suppliers a clear path to
            start real conversations, build trust, and close better deals from anywhere.
          </p>

          <div className="fade-up delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/experience"
              className="inline-flex items-center gap-2 rounded-full bg-[#66d9cb] px-6 py-3 text-sm font-bold text-[#08100f] transition hover:bg-[#8de6dc]"
            >
              Start Interactive Tour <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/photo-to-3d"
              className="inline-flex items-center gap-2 rounded-full border border-[#f6ba4f]/45 bg-[#f6ba4f]/10 px-6 py-3 text-sm font-semibold text-[#ffe7bc] transition hover:bg-[#f6ba4f]/20"
            >
              Photo to 3D (RU) <Sparkles className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {trustStats.map((stat, index) => (
              <article
                key={stat.label}
                className={`fade-up delay-${index + 1} rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl`}
              >
                <p className="text-3xl [font-family:var(--font-display)]">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#b9b3a8]">{stat.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="marketplace" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="fade-up rounded-3xl border border-white/10 bg-[#11151d]/70 p-7 backdrop-blur-xl sm:p-9">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                Experience Layer
              </p>
              <h2 className="mt-4 text-3xl leading-tight [font-family:var(--font-display)] sm:text-4xl">
                A polished commercial stage for every supplier booth.
              </h2>
              <p className="mt-5 max-w-xl text-[#ccc5b9]">
                Real-time overlays, AI-assisted chat, and object-level interaction create the feeling of a
                hosted showroom while preserving web-native accessibility for global attendees.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {pillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-2xl border border-white/10 bg-[#0d1016]/90 p-5 transition hover:border-[#66d9cb]/35"
                  >
                    <pillar.icon className="h-5 w-5 text-[#66d9cb]" />
                    <h3 className="mt-3 text-sm font-semibold tracking-wide">{pillar.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#b5aea2]">{pillar.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="fade-up delay-2 relative overflow-hidden rounded-3xl border border-[#f6ba4f]/25 bg-[#0f1014] p-7">
              <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,rgba(246,186,79,0.3),transparent_60%)]" />
              <div className="scan-line absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-transparent via-[#66d9cb]/20 to-transparent" />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#f6ba4f] [font-family:var(--font-mono)]">
                  Signal Preview
                </p>
                <h3 className="mt-3 text-2xl [font-family:var(--font-display)]">Live Stage Quality</h3>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#090b10]/80 p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-[#bdb5a8]">
                    <span>Session</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#66d9cb] shadow-[0_0_8px_rgba(102,217,203,0.8)]" />
                      Online
                    </span>
                  </div>
                  <div className="space-y-2">
                    {["Render Pipeline", "Pixel Stream", "Supplier Chat", "Product Overlay"].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                        <span>{item}</span>
                        <span className="text-[#66d9cb]">Ready</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7c0b3]">Trusted by teams</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {["Footwear", "Consumer Tech", "Industrial", "Home & Living"].map((tag) => (
                      <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-[#ddd6ca]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="fade-up rounded-3xl border border-white/10 bg-[#0f1219]/75 p-7 backdrop-blur-xl sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  Conversion Journey
                </p>
                <h2 className="mt-3 text-3xl [font-family:var(--font-display)] sm:text-4xl">
                  From curiosity to qualified lead in three steps.
                </h2>
              </div>
              <Link
                href="/experience"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"
              >
                Visit Exhibition <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {journey.map((item) => (
                <article key={item.step} className="rounded-2xl border border-white/10 bg-[#0b0e13]/80 p-5">
                  <p className="text-xs [font-family:var(--font-mono)] tracking-[0.18em] text-[#f6ba4f]">{item.step}</p>
                  <h3 className="mt-3 text-xl [font-family:var(--font-display)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#b9b2a6]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="fade-up delay-2 rounded-3xl border border-[#66d9cb]/35 bg-[linear-gradient(135deg,rgba(17,32,35,0.92),rgba(14,18,27,0.92))] p-8 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#66d9cb] [font-family:var(--font-mono)]">
                  Ready for Launch
                </p>
                <h2 className="mt-2 text-3xl [font-family:var(--font-display)] sm:text-4xl">
                  Turn your next expo into a premium digital destination.
                </h2>
                <p className="mt-3 max-w-2xl text-[#c9c1b5]">
                  Bring your suppliers, catalogs, and product scenes into one immersive environment designed for
                  measurable engagement.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/experience"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f6ba4f] px-6 py-3 text-sm font-bold text-[#120d04] transition hover:bg-[#ffd083]"
                >
                  Explore Live <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/photo-to-3d"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold transition hover:border-white/35 hover:bg-white/10"
                >
                  <Building2 className="h-4 w-4" /> Start Prototype
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
