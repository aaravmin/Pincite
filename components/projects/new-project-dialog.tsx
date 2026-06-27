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

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [patentType, setPatentType] = useState<PatentType>("utility");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createProject({ name, patentType });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setName("");
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
          </div>
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
