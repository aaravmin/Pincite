"use client";

// A major section heading that loads in the same way the hero headline does:
// a word-by-word blur-in-up cascade, fired once the first time it scrolls into
// view. Same effect everywhere so every major heading reads as one family.

import { TextAnimate } from "@/components/ui/text-animate";

type HeadingTag = "h1" | "h2" | "h3";

export function AnimatedHeading({
  as = "h2",
  className,
  children,
}: {
  as?: HeadingTag;
  className?: string;
  children: string;
}) {
  return (
    <TextAnimate
      as={as}
      by="word"
      animation="blurInUp"
      duration={0.8}
      once
      startOnView
      className={className}
    >
      {children}
    </TextAnimate>
  );
}
