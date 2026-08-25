import { describe, expect, it } from "vitest";
import type { EditionConfig } from "../scripts/edition-config.ts";
import { createUnpublishedScreen } from "./unpublished.ts";

const CONFIG: EditionConfig = {
  festival: { id: "test", name: "Test Festival" },
  days: ["2026-10-23", "2026-10-24"],
  stages: [{ id: "the-chapel", name: "The Chapel" }],
};

describe("createUnpublishedScreen", () => {
  it("shows the Edition's dates and venue", () => {
    const screen = createUnpublishedScreen(CONFIG);
    expect(screen.querySelector(".unpublished-dates")?.textContent).toBe(
      "23–24 October 2026, Kulturkirken Jakob, Oslo",
    );
  });

  it("shows a line saying the programme lands a few days beforehand", () => {
    const screen = createUnpublishedScreen(CONFIG);
    expect(screen.querySelector(".unpublished-note")?.textContent).toMatch(
      /published a few days beforehand/i,
    );
  });

  it("links to hostsabbat.no", () => {
    const screen = createUnpublishedScreen(CONFIG);
    const link = screen.querySelector<HTMLAnchorElement>(".unpublished-link");
    expect(link?.href).toBe("https://www.hostsabbat.no/");
  });

  it("spells out both months when the range crosses one", () => {
    const screen = createUnpublishedScreen({
      ...CONFIG,
      days: ["2026-10-31", "2026-11-01"],
    });
    expect(screen.querySelector(".unpublished-dates")?.textContent).toBe(
      "31 October – 1 November 2026, Kulturkirken Jakob, Oslo",
    );
  });

  it("builds no Day tabs and no Focus heart — there is nothing to switch between or dim", () => {
    const screen = createUnpublishedScreen(CONFIG);
    expect(screen.querySelector(".day-switcher")).toBeNull();
    expect(screen.querySelector(".app-focus-button")).toBeNull();
  });
});
