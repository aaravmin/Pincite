// Headlines use Baloo 2, a heavy rounded geometric sans that matches the friendly
// Pincite wordmark (not a formal serif). Body/UI stays Geist, draft text Geist Mono.
import { loadFont as loadBaloo2 } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";

export const display = loadBaloo2();
export const geist = loadGeist();
export const geistMono = loadGeistMono();
