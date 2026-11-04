import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

export const metadata: Metadata = {
  title: "Terms of Use | 3DSFERA",
  description: "Terms governing access to the 3DSFERA interactive showroom and marketing platform.",
};

const sections = [
  {
    title: "1. Platform operator",
    body: <>These terms govern your use of 3dsfera.org and the 3DSFERA platform operated by 3DSPHERE International Limited, Company No. 80291271, Unit A7, 12/F, Astoria Building, 34 Ashley Road, Tsim Sha Tsui, Hong Kong.</>,
  },
  {
    title: "2. What 3DSFERA provides",
    body: <>3DSFERA is a marketing and interactive-showroom platform. We build and host digital pavilions, guided product experiences and communication tools that connect visitors with participating brands. Brand clients pay us for pavilion, hosting and marketing services.</>,
  },
  {
    title: "3. What 3DSFERA does not provide",
    body: <>3DSFERA is not a retailer, payment institution, bank, investment platform or exchange. We do not hold user funds or operate a wallet. We do not issue cryptocurrency, tokens or NFTs. Products are sold, priced, guaranteed, fulfilled and delivered by the relevant brands, subject to each brand&apos;s own terms.</>,
  },
  {
    title: "4. Early access",
    body: <>Pre-registration records your interest in early access. It does not create a login account, guarantee admission on a particular date, or require payment. We may change, pause or discontinue pre-release features while the platform is being developed.</>,
  },
  {
    title: "5. Brand content and transactions",
    body: <>Product demonstrations and demo-pavilion items may be illustrative. Information supplied by a brand remains that brand&apos;s responsibility. Any request, meeting, quotation or purchase is a direct interaction between you and the brand unless clearly stated otherwise.</>,
  },
  {
    title: "6. Acceptable use",
    body: <>You must not misuse the platform, attempt unauthorised access, interfere with service operation, submit unlawful or misleading content, infringe intellectual property, impersonate another person or use automated systems in a way that harms the service or other visitors.</>,
  },
  {
    title: "7. Intellectual property",
    body: <>The 3DSFERA software, 3D environment, interface, branding and original content belong to 3DSPHERE International Limited or its licensors. Brand names, product images and brand materials belong to their respective owners. No rights are transferred except the limited right to use the platform under these terms.</>,
  },
  {
    title: "8. Availability and liability",
    body: <>The platform is provided on an as-available basis. To the extent permitted by law, we exclude implied warranties and are not responsible for indirect or consequential loss, third-party brand conduct, or interruptions outside our reasonable control. Nothing in these terms excludes liability that cannot legally be excluded.</>,
  },
  {
    title: "9. Governing law and contact",
    body: <>These terms are governed by the laws of Hong Kong. Questions may be sent to <a className="font-semibold text-cyan-200 underline underline-offset-4" href="mailto:support@3dsfera.org">support@3dsfera.org</a>. Brand enquiries may be sent to <a className="font-semibold text-orange-200 underline underline-offset-4" href="mailto:partners@3dsfera.org">partners@3dsfera.org</a>.</>,
  },
] as const;

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#03060c] text-white">
      <MarketingHeader />
      <main className="relative mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-400/10 blur-[120px]" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-200">Legal</p>
        <h1 className="mt-4 text-4xl font-black uppercase [font-family:var(--font-display)] sm:text-6xl">Terms of Use</h1>
        <p className="mt-5 text-sm text-white/45">Last updated: November 4, 2026</p>
        <p className="mt-8 max-w-3xl text-base leading-8 text-white/70">Please read these terms before using 3DSFERA. By using the website or submitting a form, you agree to these terms and our Privacy Policy.</p>
        <div className="mt-12 grid gap-5">
          {sections.map((section) => <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8"><h2 className="text-xl font-black uppercase [font-family:var(--font-display)]">{section.title}</h2><div className="mt-4 text-sm leading-7 text-white/60 sm:text-base">{section.body}</div></section>)}
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm"><Link href="/privacy" className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white/70 transition hover:bg-white/5 hover:text-white">Privacy Policy</Link><Link href="/" className="rounded-xl border border-orange-300/40 bg-orange-400/10 px-5 py-3 font-bold text-orange-100 transition hover:bg-orange-400/20">Return to 3DSFERA</Link></div>
      </main>
      <MarketingFooter />
    </div>
  );
}
