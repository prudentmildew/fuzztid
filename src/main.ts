import { registerSW } from "virtual:pwa-register";
import scheduleData from "../data/schedule.json";
import { HOSTSABBAT_2026 } from "../scripts/edition-config.ts";
import { createAboutSheet } from "./about.ts";
import { infoSvg } from "./icons.ts";
import { isPublished, type Schedule } from "./schedule.ts";
import { createUnpublishedScreen } from "./unpublished.ts";

const schedule = scheduleData as Schedule;

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");

const header = document.createElement("header");
header.className = "app-header";

// The wordmark is `--fg`, not `--accent` — Øyablikk's accent logo line does
// not port — and the <h1> lives here: a Day switcher is not a heading, and
// the app's name is.
const wordmark = document.createElement("h1");
wordmark.className = "app-wordmark";
wordmark.textContent = "fuzztid";
header.appendChild(wordmark);

const actions = document.createElement("div");
actions.className = "app-actions";

const aboutSheet = createAboutSheet();

const infoButton = document.createElement("button");
infoButton.type = "button";
infoButton.className = "app-info-button";
infoButton.setAttribute("aria-label", "About");
infoButton.innerHTML = infoSvg();
infoButton.addEventListener("click", aboutSheet.open);
actions.appendChild(infoButton);

header.appendChild(actions);

if (isPublished(schedule)) {
  // The full app — the Day switcher, the Now line, Favourites and Focus —
  // lands with the Schedule view itself (#22 onward). This branch is
  // unreachable today: data/schedule.json only ever holds the unpublished
  // Schedule pre-Reveal.
  throw new Error("Published Schedule rendering is not implemented yet — see issue #22.");
}

const screen = createUnpublishedScreen(HOSTSABBAT_2026);

app.append(header, screen, aboutSheet.element);

// Register the service worker so the app works offline in Kulturkirken Jakob.
// Silent by design: no onNeedRefresh handler, so a freshly deployed bundle
// waits and activates on the next cold launch rather than reloading
// mid-session. A no-op where service workers are unsupported.
registerSW({ immediate: true });
