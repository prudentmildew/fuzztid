# Høstsabbat

A mobile web app for the Høstsabbat festival programme — doom, stoner and occult rock
across the rooms of Kulturkirken Jakob, Oslo, over two days in October.

## Language

**Programme**:
The festival's schedule of acts with times and Stages, as published for one edition.
Before the Reveal there is no Programme — only a lineup.
_Avoid_: lineup (the acts without times), schedule (the on-disk artifact)

**Edition config**:
The facts that change between editions and nothing else: which edition, its dates, and
its Stages in display order.
_Avoid_: festival config, settings

**Reveal**:
The moment the festival publishes the Programme's times and Stages — historically about
four days before the festival. Before it, the source carries the acts on placeholder slots.
_Avoid_: launch, release

**Published**:
The Programme's state once every act has a Stage. A source where no act has a Stage is
not yet published; one where only some acts have a Stage is a partial Reveal, which is
an error.
