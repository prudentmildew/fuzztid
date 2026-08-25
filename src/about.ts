// About: a one-page bottom sheet reached via the Header's ⓘ. Reworked from
// Øyablikk's Settings — the gear becomes an ⓘ, and the two-page swap
// machinery (Settings ⇄ About) is gone since there is no Stage filter to
// hold a first page. The bottom-sheet visual language and dismiss
// conventions (backdrop tap, ×) stay. Informational only: no options.

export type AboutSheet = {
  element: HTMLElement;
  open(): void;
  close(): void;
};

export function createAboutSheet(): AboutSheet {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.hidden = true;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "About");
  backdrop.appendChild(sheet);

  const header = document.createElement("header");
  header.className = "sheet-header";
  const heading = document.createElement("h2");
  heading.className = "sheet-title";
  heading.textContent = "About";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "sheet-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", close);
  header.append(heading, closeButton);
  sheet.appendChild(header);

  const body = document.createElement("div");
  body.className = "about-body";
  // Purely informational: origin note, the unaffiliated-fan-project
  // disclaimer, and exactly what the app collects, before the install
  // fallback. No settings live here — there is nothing to configure.
  const paragraphs = [
    "fuzztid is an unaffiliated fan project. It is not made by, endorsed " +
      "by, or connected to Høstsabbat.",
    "The Programme is Høstsabbat's schedule as published on Broadcast, " +
      "fetched at build time and shown exactly as it shipped — it can " +
      "change without notice, so trust the festival's own channels over " +
      "this app.",
    "Privacy: your Favourites live in your browser's localStorage and " +
      "never leave your device. The only network request beyond loading " +
      "the app itself is a single anonymous page-view beacon, injected by " +
      "Cloudflare at the edge — no cookies, no fingerprinting, no " +
      "cross-site tracking.",
  ];
  for (const text of paragraphs) {
    const p = document.createElement("p");
    p.textContent = text;
    body.appendChild(p);
  }

  const install = document.createElement("section");
  install.className = "about-install";
  // Static, author-controlled copy — no user input — so innerHTML is safe.
  install.innerHTML = `<h3>Add to your home screen</h3>
    <p>It opens full screen, and it keeps working with no signal — handy in
    a stone church, where there often isn't any.</p>
    <p><strong>On iPhone or iPad:</strong> tap Share in Safari, then
    <strong>Add to Home Screen</strong>.</p>
    <p><strong>On Android:</strong> open your browser's menu (usually ⋮), then
    <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>`;
  body.appendChild(install);

  sheet.appendChild(body);

  function open(): void {
    backdrop.hidden = false;
  }

  function close(): void {
    backdrop.hidden = true;
  }

  return { element: backdrop, open, close };
}
