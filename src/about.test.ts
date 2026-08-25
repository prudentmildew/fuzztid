import { describe, expect, it } from "vitest";
import { createAboutSheet } from "./about.ts";

describe("createAboutSheet", () => {
  it("starts closed", () => {
    const sheet = createAboutSheet();
    expect(sheet.element.hidden).toBe(true);
  });

  it("opens and closes", () => {
    const sheet = createAboutSheet();
    sheet.open();
    expect(sheet.element.hidden).toBe(false);
    sheet.close();
    expect(sheet.element.hidden).toBe(true);
  });

  it("closes on a backdrop tap, not a tap inside the sheet", () => {
    const sheet = createAboutSheet();
    sheet.open();

    sheet.element
      .querySelector(".sheet")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(sheet.element.hidden).toBe(false);

    sheet.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(sheet.element.hidden).toBe(true);
  });

  it("closes on the × button", () => {
    const sheet = createAboutSheet();
    sheet.open();
    sheet.element.querySelector<HTMLButtonElement>(".sheet-close")?.click();
    expect(sheet.element.hidden).toBe(true);
  });

  it("states plainly that this is an unaffiliated fan project", () => {
    const sheet = createAboutSheet();
    expect(sheet.element.textContent).toMatch(/unaffiliated fan project/i);
  });

  it("states exactly what is collected", () => {
    const sheet = createAboutSheet();
    expect(sheet.element.textContent).toMatch(/page-view beacon/i);
    expect(sheet.element.textContent).toMatch(/no cookies/i);
  });

  it("gives static home-screen instructions for both platforms", () => {
    const sheet = createAboutSheet();
    expect(sheet.element.textContent).toMatch(/iPhone or iPad/i);
    expect(sheet.element.textContent).toMatch(/Android/i);
  });

  it("carries no form controls — informational only", () => {
    const sheet = createAboutSheet();
    expect(sheet.element.querySelectorAll("input, select").length).toBe(0);
  });
});
