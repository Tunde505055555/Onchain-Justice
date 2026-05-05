import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { WalletProvider, useWallet } from "@/lib/wallet";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NewCaseDialog } from "@/components/NewCaseDialog";
import { CaseCard } from "@/components/CaseCard";
import { CaseDetail } from "@/components/CaseDetail";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Case, getContractAddress, listCases } from "@/lib/justice";
import {
  Scale,
  Sparkles,
  ShieldCheck,
  Gavel,
  Loader2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onchain Justice — AI-powered escrow on GenLayer" },
      {
        name: "description",
        content:
          "Lock funds in escrow, submit evidence, and let an AI consensus arbiter rule on disputes — automatically enforced on the GenLayer blockchain.",
      },
      { property: "og:title", content: "Onchain Justice" },
      {
        property: "og:description",
        content:
          "A decentralized AI dispute-resolution layer for freelance work, online commerce, and digital agreements.",
      },
    ],
  }),
  component: () => (
    <WalletProvider>
      <Page />
      <Toaster richColors theme="dark" />
    </WalletProvider>
  ),
});

function Page() {
  return (
    <div className="min-h-screen text-foreground">
      <Header />
      <Hero />
      <CasesSection />
      <HowItWorks />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Scale className="h-7 w-7 text-primary" />
            <div className="absolute inset-0 blur-md bg-primary/40 -z-10" />
          </div>
          <div className="text-display text-xl tracking-tight">
            Onchain <span className="text-gradient-gold">Justice</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-28 md:pb-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" />
            Powered by GenLayer's intelligent contracts
          </div>
          <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">
            Trustless deals.
            <br />
            <span className="text-gradient-gold">Reasoned</span> verdicts.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            A decentralized arbitration layer for freelance work, online commerce, and any
            digital agreement. Lock funds in escrow, submit your side of the story, and let
            an AI-driven consensus produce a transparent, on-chain ruling — automatically
            enforced.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <NewCaseCTA />
            <a href="#cases" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Browse cases <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat icon={ShieldCheck} title="Escrow-locked" desc="Funds held by the contract until ruled." />
            <Stat icon={Gavel} title="AI arbitration" desc="LLM consensus reads agreement & evidence." />
            <Stat icon={Sparkles} title="Auto-enforced" desc="Verdict splits funds on-chain instantly." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <div className="text-display text-xl">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function NewCaseCTA() {
  const { address, connect } = useWallet();
  const [open, setOpen] = useState(false);

  const click = async () => {
    if (!getContractAddress()) {
      toast.error("Link your deployed contract first", {
        description: "Use the 'Link contract' button in the header.",
      });
      return;
    }
    if (!address) {
      try {
        await connect();
      } catch (e: any) {
        return toast.error(e?.message ?? "Connect failed");
      }
    }
    setOpen(true);
  };

  return (
    <>
      <Button size="lg" onClick={click} className="gap-2 shadow-glow">
        <Plus className="h-4 w-4" />
        Open a new escrow
      </Button>
      <NewCaseDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => window.dispatchEvent(new CustomEvent("cases:refresh"))}
      />
    </>
  );
}

function CasesSection() {
  const { address } = useWallet();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [hasContract, setHasContract] = useState(!!getContractAddress());

  const refresh = useCallback(async () => {
    setHasContract(!!getContractAddress());
    if (!getContractAddress()) {
      setCases([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      setCases(await listCases());
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load cases");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const fn = () => refresh();
    window.addEventListener("cases:refresh", fn);
    return () => window.removeEventListener("cases:refresh", fn);
  }, [refresh]);

  const visible = (cases ?? []).filter((c) => {
    if (filter === "mine" && address) {
      const me = address.toLowerCase();
      return c.payer.toLowerCase() === me || c.payee.toLowerCase() === me;
    }
    return true;
  });

  return (
    <section id="cases" className="border-t border-border/50 bg-background/40">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The docket</div>
            <h2 className="text-display text-4xl">Cases on the chain</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "mine" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("mine")}
              disabled={!address}
            >
              Mine
            </Button>
          </div>
        </div>

        <div className="mt-8">
          {!hasContract ? (
            <EmptyState
              title="No contract linked"
              desc="Deploy OnchainJustice.py on GenLayer Studio, then paste the address using the Link contract button."
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading cases…
            </div>
          ) : err ? (
            <EmptyState title="Couldn't reach the contract" desc={err} />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No cases yet"
              desc={filter === "mine" ? "You're not party to any case yet." : "Be the first to open an escrow."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible
                .slice()
                .reverse()
                .map((c) => (
                  <CaseCard key={c.id} c={c} onClick={() => setSelected(c.id)} />
                ))}
            </div>
          )}
        </div>
      </div>

      <CaseDetail
        caseId={selected}
        open={selected !== null}
        onOpenChange={(v) => !v && setSelected(null)}
        onMutated={refresh}
      />
    </section>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
      <Scale className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
      <div className="text-display text-2xl">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Lock the funds",
      body: "The payer opens an escrow with a written agreement and the counterparty's address. Funds are held by the smart contract.",
    },
    {
      n: "02",
      title: "Trade in good faith",
      body: "If everything goes as agreed, the payer releases the funds with a single transaction.",
    },
    {
      n: "03",
      title: "Disagree? File a dispute",
      body: "Either party submits their claim and any supporting evidence — messages, links, deliverables.",
    },
    {
      n: "04",
      title: "AI consensus rules",
      body: "GenLayer validators run an LLM arbitrator over the contract & evidence. The reasoned verdict splits the funds, on-chain.",
    },
  ];
  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Process</div>
        <h2 className="text-display text-4xl">How a dispute is resolved</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur"
            >
              <div className="text-mono text-xs text-primary">{s.n}</div>
              <div className="mt-1 text-display text-2xl">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
        <div>
          Built on{" "}
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GenLayer
          </a>{" "}
          · Studio chain id 61999
        </div>
        <a
          href="https://explorer-studio.genlayer.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-primary"
        >
          explorer-studio.genlayer.com
        </a>
      </div>
    </footer>
  );
}
