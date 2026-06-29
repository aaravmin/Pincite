"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/projects/actions";
import {
  PATENT_TYPES,
  PATENT_TYPE_LABELS,
  type PatentType,
} from "@/lib/projects/sections";

export function NewProjectDialog({ isAttorney = false }: { isAttorney?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [patentType, setPatentType] = useState<PatentType>("utility");
  const [clientName, setClientName] = useState("");
  const [matterNo, setMatterNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createProject({
        name,
        patentType,
        ...(isAttorney ? { clientName, matterNo } : {}),
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setName("");
      setClientName("");
      setMatterNo("");
      router.push(`/projects/${res.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            One project is one in-progress patent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adjustable widget mount"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A label so you can find this project later. It is not the patent title.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="patent-type">Patent type</Label>
            <Select
              value={patentType}
              onValueChange={(v) => setPatentType(v as PatentType)}
            >
              <SelectTrigger id="patent-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PATENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Utility covers how something works or is used (most inventions). Design covers only the
              ornamental look of an object. Plant covers a new asexually reproduced plant variety.
              This changes which checks Pincite runs, so it is hard to change later.
            </p>
          </div>
          {isAttorney && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matter-no">Matter no.</Label>
                <Input
                  id="matter-no"
                  value={matterNo}
                  onChange={(e) => setMatterNo(e.target.value)}
                  placeholder="e.g. ACM-0042"
                />
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
