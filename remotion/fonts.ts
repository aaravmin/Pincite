// Match the app's faces exactly: Fraunces for serif display, Geist for UI sans,
// Geist Mono for the draft/claim text. loadFont() registers them for the render.
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";

export const fraunces = loadFraunces();
export const geist = loadGeist();
export const geistMono = loadGeistMono();
