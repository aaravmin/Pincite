"use client";

import { useEffect } from "react";
import { sanitizeOutputText } from "@/lib/text/sanitize";

const TEXT_ATTRIBUTES = [
  "aria-label",
  "alt",
  "placeholder",
  "title",
];

function shouldSkipTextNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest("script,style,textarea,input,code,pre,kbd,samp"));
}

function cleanTextNode(node: Text) {
  if (shouldSkipTextNode(node)) return;
  const next = sanitizeOutputText(node.nodeValue ?? "");
  if (node.nodeValue !== next) node.nodeValue = next;
}

function cleanAttributes(el: Element) {
  for (const attr of TEXT_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const next = sanitizeOutputText(value);
    if (value !== next) el.setAttribute(attr, next);
  }
}

function cleanNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    cleanTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }
  const el = root as Element;
  if (el instanceof Element) cleanAttributes(el);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    cleanTextNode(node as Text);
    node = walker.nextNode();
  }
  if (el instanceof Element) {
    for (const child of Array.from(el.querySelectorAll("*"))) cleanAttributes(child);
  }
}

export function OutputSanitizer() {
  useEffect(() => {
    cleanNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") cleanNode(mutation.target);
        for (const node of Array.from(mutation.addedNodes)) cleanNode(node);
        if (mutation.type === "attributes") cleanNode(mutation.target);
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: TEXT_ATTRIBUTES,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
