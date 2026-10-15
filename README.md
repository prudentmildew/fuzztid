# fuzztid

**The Høstsabbat programme, in your pocket, in the dark, in a church.**

fuzztid is a small web app for [Høstsabbat](https://www.hostsabbat.no/): two days
of doom, stoner and occult rock inside Kulturkirken Jakob in Oslo, on 23–24
October 2026. It answers the only three questions anyone asks at a festival:

1. Who's playing now?
2. Who's playing next?
3. Which room, and how many stairs do I have to climb to get there?

Open [fuzztid.no](https://fuzztid.no) on your phone. That's it. That's the app.

> fuzztid is an unaffiliated fan project. It is not made by, endorsed by, or
> connected to Høstsabbat. If the app and the festival ever disagree, the
> festival wins. Always.

## What it does

- **Shows the running order.** Two Days, three rooms side by side:
  **Church of Riffs**, **The Crypt** and **Kafé Hærverk**. Swipe between Friday
  and Saturday. Nothing else to configure, because there is nothing else.
- **Draws a red line at "now".** The Now line slides down the screen as the
  evening wears on, so you can see at a glance that you are, once again,
  running late.
- **Remembers your favourites.** Tap a band to star it. Tap the heart at the top
  to dim everything you didn't star, which is what we call Focus and what
  your friends call "being decisive".
- **Works offline.** Kulturkirken Jakob is a beautiful stone church, and stone
  churches were not designed with 5G in mind. Install the app once with signal,
  and it opens without any.
- **Updates itself.** When the festival changes the programme, the app notices
  on its next check and quietly picks up the new version the next time you open
  it. No refresh button. No reinstall. No drama.

## What it doesn't do

- Sell tickets, beer or merch.
- Tell you which band is best. That's what the people next to you at the bar
  are for.
- Track you. Your favourites stay on your phone. The only thing that ever
  leaves it is one anonymous page view, so we know whether anyone is using this
  thing.
- Cross midnight. The headliners finish at 23:59. Make of that what you will.

## Installing it

1. Open [fuzztid.no](https://fuzztid.no) on your phone.
2. Tap the ⓘ in the corner. It explains how to add the app to your home screen
   on iPhone and on Android.
3. Feel smug in the queue while everyone else squints at a JPEG of the
   running order.

## Where the name comes from

**Fuzz** is the sound. **Tid** is Norwegian for time. Together, they are the
answer to "what time is the fuzz?". The app's older sibling,
[Øyablikk](https://oyablikk.no), does the same job for Øya Festivalen, with
more sunshine and fewer robes.

## For the curious

The app is plain TypeScript with no framework, because a programme with 24
bands does not need one. An hourly job reads the festival's published schedule,
checks that no two bands are booked into the same room at the same time, and
redeploys when something has changed. Running it locally needs Node 24 and
pnpm:

```sh
pnpm install
pnpm dev      # run it
pnpm test     # prove it
```

The *why* behind every decision lives in [`docs/adr/`](docs/adr/), and the
vocabulary lives in [`CONTEXT.md`](CONTEXT.md). Both are considerably less funny
than this file.

---

*Made with love, fuzz and an unreasonable number of pull requests.* 🤘
