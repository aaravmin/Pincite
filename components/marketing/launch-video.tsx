"use client";

import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * The Launch video action. Opens the Pincite demo film in a wide dialog and
 * plays it. The video only mounts once the dialog is open (and unmounts on
 * close) so the ~8MB asset is never fetched until asked for.
 *
 * By default it renders the nav-style ghost trigger reading "Launch video".
 * Callers (hero, closing CTA) can pass a `className` to restyle the trigger and
 * `children` to relabel it, without changing the nav usage.
 */
export function LaunchVideo({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          className,
        )}
      >
        <Play className="size-4" aria-hidden />
        {children ?? "Launch video"}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Pincite launch video</DialogTitle>
        {open && (
          <video
            className="aspect-video w-full bg-black"
            src="/pincite-demo.mp4"
            controls
            autoPlay
            playsInline
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
