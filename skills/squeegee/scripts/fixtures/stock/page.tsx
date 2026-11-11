import { Check, Sparkles, Zap, Shield } from "lucide-react";

// An untouched generated landing page. The detector must flag the default cluster and the tells.
export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <section className="py-24 text-center">
        <span className="rounded-full border px-3 py-1 text-xs">New: AI workflows</span>
        <h1 className="text-center text-6xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Supercharge your workflow
        </h1>
        <p className="mt-[13px] text-muted-foreground">Trusted by 10,000+ teams</p>
        <button className="mt-[22px] rounded-md bg-indigo-500 px-6 py-3 text-white transition-all duration-500 hover:bg-indigo-600 outline-none">
          Get started 🚀
        </button>
      </section>
      <section className="grid grid-cols-3 gap-[27px]">
        <div className="rounded-xl border border-indigo-500 p-6"><Zap className="text-indigo-500" /><h3>⚡ Fast</h3></div>
        <div className="rounded-xl border border-violet-500 p-6"><Shield className="text-violet-500" /><h3>Secure</h3></div>
        <div className="rounded-xl border border-purple-500 p-6"><Sparkles className="animate-pulse text-purple-500" /><h3>Smart</h3></div>
      </section>
      <ul>
        <li><Check /> Unlimited projects</li>
        <li><Check /> Priority support</li>
        <li><Check /> Advanced analytics</li>
      </ul>
      <blockquote>"It changed everything." Jane Doe, Acme Inc</blockquote>
    </main>
  );
}
