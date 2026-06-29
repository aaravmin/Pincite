"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle. The theme is a class on <html> set before paint by the inline script
 * in the root layout; here we read the current state and flip it, persisting the choice.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pincite-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked; the class still applies for this session */
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-pressed={dark}
      // Avoid a wrong-label flash before the effect reads the real state.
      className={ready ? "" : "invisible"}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
      {dark ? "Switch to light" : "Switch to dark"}
    </Button>
  );
}
