// icons.ts owns the shape and the stylesheet owns the size (#30): a width or
// height attribute on the <svg> would fight `.app-actions svg` and
// `.act-heart svg`, which is how the heart came to be 40 px beside a 24 px ⓘ.
import { describe, expect, it } from "vitest";
import { heartSvg, infoSvg } from "./icons.ts";

describe("Header glyphs", () => {
  it.each([
    ["heartSvg(true)", heartSvg(true)],
    ["heartSvg(false)", heartSvg(false)],
    ["infoSvg()", infoSvg()],
  ])("%s carries a viewBox, is hidden from the tree, and sets no width or height", (_, svg) => {
    expect(svg).toMatch(/<svg[^>]*\sviewBox="0 0 24 24"/);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
    expect(svg).not.toMatch(/<svg[^>]*\sheight=/);
  });

  it("fills the heart only when asked", () => {
    expect(heartSvg(true)).toContain('fill="currentColor"');
    expect(heartSvg(false)).toContain('fill="none"');
  });
});
