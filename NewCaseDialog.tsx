import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createCase, waitForTx } from "@/lib/justice";
import { toast } from "sonner";
import { Scale, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/wallet";

export function NewCaseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { address } = useWallet();
  const [counterparty, setCounterparty] = useState("");
  const [agreement, setAgreement] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!address) return toast.error("Connect a wallet first");
    if (!/^0x[a-fA-F0-9]{40}$/.test(counterparty.trim()))
      return toast.error("Enter a valid counterparty address");
    if (agreement.trim().length < 10)
      return toast.error("Describe the agreement (min 10 chars)");
    const eth = parseFloat(amount);
    if (!(eth > 0)) return toast.error("Amount must be > 0");

    setSubmitting(true);
    try {
      const wei = BigInt(Math.floor(eth * 1e18));
      const tx = await createCase(counterparty.trim(), agreement.trim(), wei);
      toast.message("Case submitted", { description: "Waiting for finalization…" });
      await waitForTx(tx);
      toast.success("Escrow opened. Funds locked on-chain.");
      onCreated();
      onOpenChange(false);
      setCounterparty("");
      setAgreement("");
      setAmount("0.01");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage ?? e?.message ?? "Failed to create case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-display text-3xl flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Open a new escrow
          </DialogTitle>
          <DialogDescription>
            Lock funds against a written agreement. The counterparty can release them, or
            either side can call for AI arbitration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Counterparty address</Label>
            <Input
              placeholder="0x… (the other party)"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="text-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (GEN)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>The agreement</Label>
            <Textarea
              rows={6}
              placeholder="e.g. I'll deliver a 5-page landing page (Figma + React) by May 15. Payment released on delivery of working code in a public repo."
              value={agreement}
              onChange={(e) => setAgreement(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Be precise. The AI arbitrator will rule based on this text and the evidence
              both sides submit.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Lock funds in escrow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
