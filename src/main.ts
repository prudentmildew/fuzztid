import { registerSW } from "virtual:pwa-register";
import scheduleData from "../data/schedule.json";
import { createAboutSheet } from "./about.ts";
import { createDaySwitcher } from "./day-switcher.ts";
import { infoSvg } from "./icons.ts";
import { isPublished, type Schedule } from "./schedule.ts";
import { createScheduleView } from "./schedule-view.ts";
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

// Favourites and Focus land on top of this static render in #25.
const TICK_MS = 60_000;

let screen: HTMLElement;
if (isPublished(schedule)) {
  screen = document.createElement("div");

  // The switcher's onSelect needs the view (to call showDay); the view's
  // onActiveDayChange needs the switcher (to repaint its tabs). Neither
  // exists yet when the other is built, so the view is captured by
  // reference rather than threaded through a constructor argument.
  let view: ReturnType<typeof createScheduleView>;
  const switcher = createDaySwitcher({
    days: schedule.days,
    onSelect: (date) => view.showDay(date),
  });

  const spacer = document.createElement("div");
  spacer.className = "app-header-spacer";

  // Header order: wordmark, switcher, spacer, actions (Focus heart, ⓘ) —
  // `actions` is already mounted, so both land just ahead of it.
  header.insertBefore(switcher.element, actions);
  header.insertBefore(spacer, actions);

  view = createScheduleView({
    container: screen,
    schedule,
    now: () => new Date(),
    onActiveDayChange: (day, today) => switcher.update(day.date, today),
  });
  view.render();
  setInterval(() => view.tick(new Date()), TICK_MS);
} else {
  screen = createUnpublishedScreen(schedule);
}

app.append(header, screen, aboutSheet.element);

// Register the service worker so the app works offline in Kulturkirken Jakob.
// Silent by design: no onNeedRefresh handler, so a freshly deployed bundle
// waits and activates on the next cold launch rather than reloading
// mid-session. A no-op where service workers are unsupported.
registerSW({ immediate: true });
