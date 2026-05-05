import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Code2, Download, Copy, Check } from "lucide-react";
import { CONTRACT_SOURCE } from "@/lib/contractSource";
import { toast } from "sonner";

export function ContractSourceDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(CONTRACT_SOURCE);
    setCopied(true);
    toast.success("Contract source copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([CONTRACT_SOURCE], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "OnchainJustice.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Code2 className="h-4 w-4" />
        View contract
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-display text-3xl">OnchainJustice.py</DialogTitle>
          <DialogDescription>
            The intelligent contract that powers this app. Deploy it on{" "}
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              GenLayer Studio
            </a>{" "}
            (no constructor args), copy the deployed address, and link it under{" "}
            <span className="text-mono">Link contract</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button onClick={copy} size="sm" variant="secondary" className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={download} size="sm" variant="secondary" className="gap-2">
            <Download className="h-4 w-4" /> Download .py
          </Button>
        </div>
        <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-[oklch(0.12_0.02_265)] p-4 text-mono text-xs leading-relaxed text-foreground/90">
          {CONTRACT_SOURCE}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
