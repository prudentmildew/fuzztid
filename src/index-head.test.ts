// Branding + asset wiring: the document head carries the fuzztid name, the
// manifest, both favicon flavours, OG tags, and every asset it points at
// exists. The font stays self-hosted — no external font URLs.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("src/styles.css", "utf8");

const DESCRIPTION =
  "Who's on right now, on which stage? A mobile programme for Høstsabbat 2026 at Kulturkirken Jakob, Oslo, 23–24 October.";

describe("index.html head", () => {
  it("titles the app with the shared description string", () => {
    expect(html).toContain(`<title>${DESCRIPTION}</title>`);
  });

  it("shares one description string across the title, description meta and og:description", () => {
    expect(html).toContain(`name="description"\n      content="${DESCRIPTION}"`);
    expect(html).toContain(`content="${DESCRIPTION}"`);
  });

  it("links the manifest and both favicon flavours", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('href="./favicon.svg"');
    expect(html).toContain('rel="apple-touch-icon"');
  });

  it("carries OG and twitter tags with an absolute URL on the apex", () => {
    expect(html).toMatch(/property="og:url"\s+content="https:\/\/fuzztid\.no\/"/);
    expect(html).toMatch(/property="og:image"\s+content="https:\/\/fuzztid\.no\/og\.png"/);
    expect(html).toContain('name="twitter:card"');
  });

  it("sets theme-color to --bg", () => {
    expect(html).toContain('name="theme-color" content="#0b0a0c"');
  });

  it("requests no third-party fonts or styles", () => {
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).not.toContain("fonts.gstatic.com");
  });
});

describe("manifest.webmanifest", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

  it("names the app fuzztid on #0b0a0c, not pure black", () => {
    expect(manifest.name).toBe("fuzztid");
    expect(manifest.background_color).toBe("#0b0a0c");
    expect(manifest.theme_color).toBe("#0b0a0c");
  });

  it("shares the description string", () => {
    expect(manifest.description).toBe(DESCRIPTION);
  });

  it("keeps the stable '/' id and relative start_url/scope", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe(".");
    expect(manifest.scope).toBe(".");
  });

  it("lists ./-relative icons that actually exist in public/", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith("./"), icon.src).toBe(true);
      expect(existsSync(`public/${icon.src}`), icon.src).toBe(true);
    }
  });
});

describe("branding assets", () => {
  it.each(["favicon.svg", "apple-touch-icon.png", "og.png", "icon-192.png", "icon-512.png"])(
    "public/%s exists",
    (f) => {
      expect(existsSync(`public/${f}`)).toBe(true);
    },
  );
});

describe("self-hosted display font", () => {
  it("declares Oswald from a bundled asset, not a CDN", () => {
    expect(css).toMatch(/@font-face[\s\S]*?src: url\("\.\/assets\/oswald[^"]+\.woff2"\)/);
    expect(existsSync("src/assets/oswald-latin-var.woff2")).toBe(true);
  });

  it("loads every stylesheet url() locally — no remote asset can sneak in", () => {
    for (const [, url] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      expect(url, `local url: ${url}`).toMatch(/^\.\//);
    }
  });
});

describe("the mark carries the palette (public/favicon.svg)", () => {
  const TOKENS = ["#0b0a0c", "#2a2326", "#4a3d40", "#d9d2c7", "#948b83", "#d9452f"];

  it("uses only ADR-0025's six tokens for every fill and stroke", () => {
    const svg = readFileSync("public/favicon.svg", "utf8");
    const colors = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) {
      expect(TOKENS, `${color} is one of the six tokens`).toContain(color?.toLowerCase());
    }
  });

  it("uses --accent exactly once", () => {
    const svg = readFileSync("public/favicon.svg", "utf8");
    const accentCount = [...svg.matchAll(/#d9452f/gi)].length;
    expect(accentCount).toBe(1);
  });
});
