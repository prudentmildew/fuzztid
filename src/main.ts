import { registerSW } from "virtual:pwa-register";
import scheduleData from "../data/schedule.json";
import { createAboutSheet } from "./about.ts";
import { createDaySwitcher } from "./day-switcher.ts";
import { applyDebugParams } from "./debug.ts";
import { loadFavourites } from "./favourites.ts";
import { heartSvg, infoSvg } from "./icons.ts";
import { isPublished, type Schedule } from "./schedule.ts";
import { createScheduleView } from "./schedule-view.ts";
import { createUnpublishedScreen } from "./unpublished.ts";

// Dev-only (#29): `?schedule=2025` and `?now=…` — a no-op in a production build.
const { schedule, now } = await applyDebugParams(location.href, scheduleData as Schedule);

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

const TICK_MS = 60_000;

let screen: HTMLElement;
if (isPublished(schedule)) {
  screen = document.createElement("div");

  // The switcher's onSelect needs the view (to call showDay); the view's
  // onActiveDayChange needs the switcher (to repaint its tabs); onActTap
  // needs the view (to repaint favourites). Neither exists yet when the
  // other is built, so the view is captured by reference rather than
  // threaded through a constructor argument.
  let view: ReturnType<typeof createScheduleView>;
  const switcher = createDaySwitcher({
    days: schedule.days,
    onSelect: (date) => view.showDay(date),
  });

  const spacer = document.createElement("div");
  spacer.className = "app-header-spacer";

  // Focus (ADR-0021, ported by reference): a transient squint at my own
  // night, never persisted. Filled in both states — outline-vs-fill already
  // means "favourited" everywhere else, so here the colour carries the
  // state instead.
  const focusButton = document.createElement("button");
  focusButton.type = "button";
  focusButton.className = "app-focus-button";
  focusButton.setAttribute("aria-label", "Focus on Favourites");
  focusButton.setAttribute("aria-pressed", "false");
  focusButton.innerHTML = heartSvg(true);
  actions.insertBefore(focusButton, infoButton);

  let focus = false;

  function syncFocus(): void {
    // Nothing starred = nothing to focus on, and dimming everything would
    // leave an unreadable screen with no way back (#25).
    focusButton.disabled = favourites.ids.size === 0;
    focusButton.setAttribute("aria-pressed", String(focus));
    screen.classList.toggle("focus", focus);
  }

  focusButton.addEventListener("click", () => {
    focus = !focus;
    syncFocus();
  });

  // Header order: wordmark, switcher, spacer, actions (Focus heart, ⓘ) —
  // `actions` is already mounted, so both land just ahead of it.
  header.insertBefore(switcher.element, actions);
  header.insertBefore(spacer, actions);

  // Stale stars self-heal against the current Schedule (ADR-0019), under
  // this Edition's own key (#29).
  const favourites = loadFavourites(schedule);

  view = createScheduleView({
    container: screen,
    schedule,
    now,
    onActiveDayChange: (day, today) => switcher.update(day.date, today),
    onActTap: (actId) => {
      // The state flip is the feedback (ADR-0019) — instant repaint, no toast.
      favourites.toggle(actId);
      // Unstarring the last favourite in Focus would dim every act and
      // disable the way back out. Drop out of Focus instead (ADR-0021).
      if (favourites.ids.size === 0) focus = false;
      syncFocus();
      view.render({ favourites: favourites.ids });
    },
  });
  view.render({ favourites: favourites.ids });
  syncFocus();
  setInterval(() => view.tick(now()), TICK_MS);
} else {
  screen = createUnpublishedScreen(schedule);
}

app.append(header, screen, aboutSheet.element);

// Register the service worker so the app works offline in Kulturkirken Jakob.
// Silent by design: no onNeedRefresh handler, so a freshly deployed bundle
// waits and activates on the next cold launch rather than reloading
// mid-session. A no-op where service workers are unsupported.
registerSW({ immediate: true });
