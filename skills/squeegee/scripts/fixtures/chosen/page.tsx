import { Check, ArrowRight } from "lucide-react";

// A page with deliberate choices. The detector must not flag the cluster or raise tells here.
export default function Page() {
  return (
    <main className="bg-paper text-ink">
      <section className="py-24">
        <h1 className="max-w-[18ch] text-6xl font-medium tracking-tight">Ledgers that close themselves</h1>
        <p className="mt-6 max-w-prose text-lg">Month-end in two days. 412 finance teams use it.</p>
        <a href="/start" className="mt-8 inline-flex h-11 items-center gap-2 rounded-sm bg-accent px-6 text-paper transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2">
          Start a close <ArrowRight strokeWidth={1.5} />
        </a>
      </section>
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-7 border-t border-rule pt-6">Reconciliation</div>
        <div className="col-span-5 border-t border-rule pt-6">Approvals</div>
      </section>
    </main>
  );
}
