import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Case,
  getCase,
  releaseFunds,
  raiseDispute,
  submitEvidence,
  resolveWithAi,
  waitForTx,
} from "@/lib/justice";
import { shortAddr, useWallet } from "@/lib/wallet";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Gavel,
  CheckCircle2,
  Sparkles,
  Send,
  HandCoins,
  ShieldAlert,
  ExternalLink,
  User,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  Hash,
  Image as ImageIcon,
  MessageSquare,
  ArrowRight,
  Bell,
  Info,
} from "lucide-react";
import { EXPLORER_BASE } from "@/lib/genlayer";

export function CaseDetail({
  caseId,
  open,
  onOpenChange,
  onMutated,
}: {
  caseId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMutated: () => void;
}) {
  const { address } = useWallet();
  const [c, setC] = useState<Case | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");

  const refresh = async () => {
    if (caseId == null) return;
    setLoading(true);
    try {
      setC(await getCase(caseId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open, caseId]);

  if (!c) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Loading…"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const me = address?.toLowerCase();
  const isPayer = me === c.payer.toLowerCase();
  const isPayee = me === c.payee.toLowerCase();
  const isParty = isPayer || isPayee;
  const eth = (n: number) => (Number(n) / 1e18).toFixed(4);

  // Status framing
  const statusMeta = (() => {
    if (c.status === 0)
      return {
        label: "Escrow Active",
        tone: "bg-primary/10 text-primary border-primary/30",
        icon: <Lock className="h-3.5 w-3.5" />,
        desc: "Funds are locked. The payer can release at any time.",
      };
    if (c.status === 1) {
      const bothClaimed = !!c.payer_claim && !!c.payee_claim;
      if (!bothClaimed)
        return {
          label: "Awaiting Response",
          tone: "bg-warning/10 text-warning border-warning/40",
          icon: <Clock className="h-3.5 w-3.5" />,
          desc: "A dispute has been opened. Waiting for the other party to respond.",
        };
      return {
        label: "Under Review",
        tone: "bg-warning/10 text-warning border-warning/40",
        icon: <Gavel className="h-3.5 w-3.5" />,
        desc: "Both parties have stated their case. Either side can call for an AI ruling.",
      };
    }
    return {
      label: "Resolved",
      tone: "bg-success/10 text-success border-success/40",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      desc: "The verdict has been issued and funds were distributed accordingly.",
    };
  })();

  const nextStep = (() => {
    if (c.status === 0) {
      if (isPayer) return "Release funds if the work is complete, or raise a dispute.";
      if (isPayee) return "Waiting for the payer to release funds.";
      return null;
    }
    if (c.status === 1) {
      const myClaim = isPayer ? c.payer_claim : isPayee ? c.payee_claim : "";
      if (isParty && !myClaim) return "Submit your side of the story below.";
      if (isPayer && !c.payee_claim) return "Waiting for counterparty to respond.";
      if (isPayee && !c.payer_claim) return "Waiting for counterparty to respond.";
      return "Add evidence or call for an AI ruling when ready.";
    }
    return null;
  })();

  const guard = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      const tx = await fn();
      if (tx) await waitForTx(tx);
      toast.success(`${label} confirmed`);
      if (label === "Ruling" && caseId != null) {
        for (let i = 0; i < 20; i++) {
          const fresh = await getCase(caseId);
          if (fresh && fresh.status === 2) {
            setC(fresh);
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      await refresh();
      onMutated();
      setClaim("");
      setEvidence("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-mono">
              CASE #{c.id.toString().padStart(4, "0")}
            </Badge>
            <Badge variant="outline" className={`gap-1 ${statusMeta.tone}`}>
              {statusMeta.icon}
              {statusMeta.label}
            </Badge>
          </div>

          {/* Status banner */}
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-foreground">{statusMeta.desc}</div>
                {nextStep && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    <span>Next step: {nextStep}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogTitle className="text-display text-2xl pt-2">The agreement</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-foreground/80">
            {c.agreement}
          </DialogDescription>
        </DialogHeader>

        {/* Parties + Escrow */}
        <div className="grid gap-3 md:grid-cols-2">
          <PartyCard
            role="Payer"
            address={c.payer}
            isYou={isPayer}
            tone="warning"
          />
          <PartyCard
            role="Payee"
            address={c.payee}
            isYou={isPayee}
            tone="success"
          />
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Escrow Locked
                </div>
                <div className="text-display text-2xl text-gradient-gold">
                  {eth(c.amount)} GEN
                </div>
              </div>
            </div>
            {c.status === 2 ? (
              <div className="text-right text-sm">
                <div className="text-xs text-muted-foreground">Distribution</div>
                <div className="text-mono">
                  <span className="text-warning">{eth(c.payer_share)}</span>
                  {" / "}
                  <span className="text-success">{eth(c.payee_share)}</span>
                </div>
              </div>
            ) : (
              <p className="max-w-[55%] text-right text-xs text-muted-foreground">
                Funds will be released automatically based on the resolution outcome.
              </p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <Timeline status={c.status} hasPayerClaim={!!c.payer_claim} hasPayeeClaim={!!c.payee_claim} />

        {/* Status-driven actions */}
        {c.status === 0 && isParty && (
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Happy path
            </div>
            {isPayer ? (
              <>
                <p className="text-sm text-muted-foreground">
                  If the work was completed as agreed, release the funds to the payee.
                </p>
                <Button
                  className="gap-2"
                  onClick={() => guard("Release", () => releaseFunds(c.id))}
                  disabled={!!busy}
                >
                  {busy === "Release" ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                  Release {eth(c.amount)} GEN to payee
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Waiting for the payer to release the funds. If something is wrong, raise a
                dispute below.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Open a dispute
              </Label>
              <p className="text-xs text-muted-foreground">
                Tip: structure your claim as <span className="text-mono">Expected · Actual · Issue</span> for the clearest outcome.
              </p>
              <Textarea
                rows={4}
                placeholder={"Expected: Logo delivered as 3 vector files by Apr 30.\nActual: Received only 1 raster PNG on May 3.\nIssue: Deliverable does not match scope."}
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={!!busy || claim.trim().length < 5}
                onClick={() => guard("Dispute", () => raiseDispute(c.id, claim.trim()))}
                className="gap-2"
              >
                {busy === "Dispute" && <Loader2 className="h-4 w-4 animate-spin" />}
                Raise dispute
              </Button>
            </div>
          </div>
        )}

        {c.status === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ClaimColumn
                title="Payer's case"
                roleLabel={isPayer ? "You (Payer)" : "Counterparty (Payer)"}
                claim={c.payer_claim}
                evidence={c.payer_evidence}
                isYou={isPayer}
                tone="warning"
              />
              <ClaimColumn
                title="Payee's case"
                roleLabel={isPayee ? "You (Payee)" : "Counterparty (Payee)"}
                claim={c.payee_claim}
                evidence={c.payee_evidence}
                isYou={isPayee}
                tone="success"
              />
            </div>

            {isParty && (
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <div>
                  <Label className="text-base">Submit evidence</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Strong evidence is verifiable. Examples that work well:
                  </p>
                  <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 rounded border border-border/50 bg-muted/20 px-2 py-1">
                      <Hash className="h-3 w-3 text-primary" /> Transaction hash
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-border/50 bg-muted/20 px-2 py-1">
                      <ImageIcon className="h-3 w-3 text-primary" /> Screenshot link
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-border/50 bg-muted/20 px-2 py-1">
                      <MessageSquare className="h-3 w-3 text-primary" /> Message excerpt
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Update your claim (optional)
                  </Label>
                  <Input
                    placeholder="e.g. Restating: deliverable did not match the agreed scope."
                    value={claim}
                    onChange={(e) => setClaim(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Your evidence</Label>
                  <Textarea
                    rows={3}
                    placeholder={"Tx hash: 0xabc…\nScreenshot: https://…\nQuote from chat on May 2: \"…\""}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      guard("Evidence", () => submitEvidence(c.id, claim.trim(), evidence.trim()))
                    }
                    disabled={!!busy || evidence.trim().length < 3}
                    className="gap-2"
                  >
                    {busy === "Evidence" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit evidence
                  </Button>

                  <Button
                    variant="default"
                    onClick={() => guard("Ruling", () => resolveWithAi(c.id))}
                    disabled={!!busy}
                    className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.7_0.15_70)] text-primary-foreground"
                  >
                    {busy === "Ruling" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gavel className="h-4 w-4" />
                    )}
                    Call for AI ruling
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The ruling triggers GenLayer's optimistic-democracy consensus over an LLM
                  arbitrator. Funds are released according to the verdict.
                </p>
              </div>
            )}
          </div>
        )}

        {c.status === 2 && (
          <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-display text-2xl">
              <Gavel className="h-5 w-5 text-primary" />
              Verdict
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {c.ruling || "Funds were released."}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Payer recovers</div>
                <div className="text-display text-xl text-warning">{eth(c.payer_share)} GEN</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Payee receives</div>
                <div className="text-display text-xl text-success">{eth(c.payee_share)} GEN</div>
              </div>
            </div>
          </div>
        )}

        <a
          href={`${EXPLORER_BASE}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          View on GenLayer Explorer <ExternalLink className="h-3 w-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

function PartyCard({
  role,
  address,
  isYou,
  tone,
}: {
  role: "Payer" | "Payee";
  address: string;
  isYou: boolean;
  tone: "warning" | "success";
}) {
  const toneCls =
    tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-success/30 bg-success/5";
  const dot = tone === "warning" ? "bg-warning" : "bg-success";
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {isYou ? (
          <span className="flex items-center gap-1 font-medium text-foreground">
            <User className="h-3 w-3" /> You ({role})
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> Counterparty ({role})
          </span>
        )}
      </div>
      <div className="mt-1 text-mono text-sm">{shortAddr(address)}</div>
    </div>
  );
}

function Timeline({
  status,
  hasPayerClaim,
  hasPayeeClaim,
}: {
  status: 0 | 1 | 2;
  hasPayerClaim: boolean;
  hasPayeeClaim: boolean;
}) {
  const steps = [
    { label: "Escrow created", done: true },
    { label: "Dispute opened", done: status >= 1 },
    {
      label: status === 2 ? "Both parties responded" : "Awaiting response",
      done: status === 2 || (hasPayerClaim && hasPayeeClaim),
      active: status === 1 && !(hasPayerClaim && hasPayeeClaim),
    },
    { label: "Resolved", done: status === 2 },
  ];
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        Timeline
      </div>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-1">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                s.done
                  ? "border-success bg-success/20 text-success"
                  : s.active
                    ? "border-warning bg-warning/20 text-warning animate-pulse"
                    : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {s.done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={
                s.done
                  ? "text-foreground"
                  : s.active
                    ? "text-warning"
                    : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="mx-1 h-3 w-3 text-muted-foreground/60" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function parseStructured(claim: string) {
  if (!claim) return null;
  const pick = (re: RegExp) => {
    const m = claim.match(re);
    return m ? m[1].trim() : "";
  };
  const expected = pick(/expected\s*[:\-]\s*([^\n]+)/i);
  const actual = pick(/actual\s*[:\-]\s*([^\n]+)/i);
  const issue = pick(/issue\s*[:\-]\s*([^\n]+)/i);
  if (!expected && !actual && !issue) return null;
  return { expected, actual, issue };
}

function ClaimColumn({
  title,
  roleLabel,
  claim,
  evidence,
  isYou,
  tone,
}: {
  title: string;
  roleLabel: string;
  claim: string;
  evidence: string[];
  isYou: boolean;
  tone: "warning" | "success";
}) {
  const structured = parseStructured(claim);
  const toneRing =
    tone === "warning" ? "border-warning/30" : "border-success/30";
  return (
    <div className={`rounded-lg border ${toneRing} bg-card/40 p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-display text-lg">{title}</div>
        <Badge variant="outline" className="text-[10px]">
          {roleLabel}
        </Badge>
      </div>

      {claim ? (
        structured ? (
          <div className="mt-2 space-y-2 text-sm">
            <KeyPoint label="Expected delivery" value={structured.expected} />
            <KeyPoint label="Actual delivery" value={structured.actual} />
            <KeyPoint label="Issue" value={structured.issue} accent />
            <details className="pt-1 text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                View full claim
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-foreground/80">{claim}</p>
            </details>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{claim}</p>
        )
      ) : (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-2 text-sm">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium text-foreground">
              Waiting for {isYou ? "your" : "counterparty"} response
            </div>
            <div className="text-xs text-muted-foreground">
              {isYou
                ? "Submit your claim and evidence below."
                : "They have been notified on-chain."}
            </div>
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <>
          <div className="mt-3 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3 w-3" /> Evidence ({evidence.length})
          </div>
          <ul className="mt-1 space-y-1 text-sm">
            {evidence.map((e, i) => (
              <li
                key={i}
                className="rounded border-l-2 border-primary/50 bg-muted/30 px-2 py-1 text-foreground/80"
              >
                {e}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function KeyPoint({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {accent && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {label}
      </div>
      <div className={`text-sm ${accent ? "text-foreground" : "text-foreground/85"}`}>
        {value || <span className="italic text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
