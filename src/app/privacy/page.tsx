import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

export const metadata: Metadata = {
  title: "Privacy Policy | 3DSFERA",
  description: "Privacy information for visitors, early-access applicants and brand contacts using 3DSFERA.",
};

const sections = [
  {
    title: "1. Who we are",
    body: <>3DSFERA is operated by 3DSPHERE International Limited, Company No. 80291271, a technology company based in Hong Kong. Our registered address is Unit A7, 12/F, Astoria Building, 34 Ashley Road, Tsim Sha Tsui, Hong Kong.</>,
  },
  {
    title: "2. Information we collect",
    body: <>When you browse the website or submit a form, we may collect contact and registration details such as your name, email address, requested username, phone number, company, country, account type and any message you provide. We may also receive technical information such as IP address, browser type, device data, page activity, referral source and security logs.</>,
  },
  {
    title: "3. How we use information",
    body: <>We use information to manage early-access requests, respond to enquiries, communicate service and launch updates, arrange brand meetings, improve the website, measure campaign performance, prevent abuse and comply with legal obligations. We do not use the website to hold customer funds or provide financial exchange services.</>,
  },
  {
    title: "4. Legal bases and consent",
    body: <>We process information where you have given consent, where it is needed to respond to your request, where we have a legitimate interest in operating and securing the platform, or where the law requires it. You may withdraw marketing consent at any time by contacting us.</>,
  },
  {
    title: "5. Sharing and international processing",
    body: <>We may share information with service providers that support hosting, email delivery, analytics, security and customer communications. They may process information in other countries under appropriate contractual and security safeguards. We do not sell personal information.</>,
  },
  {
    title: "6. Retention and security",
    body: <>We keep information only for as long as reasonably necessary for the purposes described above, including legal, accounting and security requirements. We use organisational and technical safeguards designed to protect information, but no online system can guarantee absolute security.</>,
  },
  {
    title: "7. Your choices and rights",
    body: <>Depending on applicable law, you may request access, correction, deletion, restriction, portability or objection to certain processing. You may also unsubscribe from non-essential emails. We may need to verify your identity before completing a request.</>,
  },
  {
    title: "8. Contact",
    body: <>For privacy questions or requests, email <a className="font-semibold text-cyan-200 underline underline-offset-4" href="mailto:support@3dsfera.org">support@3dsfera.org</a>. You may also contact your local data protection authority where applicable.</>,
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#03060c] text-white">
      <MarketingHeader />
      <main className="relative mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Legal</p>
        <h1 className="mt-4 text-4xl font-black uppercase [font-family:var(--font-display)] sm:text-6xl">Privacy Policy</h1>
        <p className="mt-5 text-sm text-white/45">Last updated: November 4, 2026</p>
        <p className="mt-8 max-w-3xl text-base leading-8 text-white/70">This policy explains how 3DSPHERE International Limited collects, uses and protects information when you use 3dsfera.org, request early access or contact us about a brand pavilion.</p>
        <div className="mt-12 grid gap-5">
          {sections.map((section) => <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8"><h2 className="text-xl font-black uppercase [font-family:var(--font-display)]">{section.title}</h2><div className="mt-4 text-sm leading-7 text-white/60 sm:text-base">{section.body}</div></section>)}
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm"><Link href="/terms" className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white/70 transition hover:bg-white/5 hover:text-white">Terms of Use</Link><Link href="/" className="rounded-xl border border-orange-300/40 bg-orange-400/10 px-5 py-3 font-bold text-orange-100 transition hover:bg-orange-400/20">Return to 3DSFERA</Link></div>
      </main>
      <MarketingFooter />
    </div>
  );
}
