# 7. The UI is English

Date: 2026-10-30 · Status: accepted, amended by ADR 0012 (no insider words)

## Context

The shop and forms were written in Indonesian: routes (`/masuk`, `/pesanan`, `/staf`), copy, emails, statuses and many identifiers. The docs site was English, and `@ppitsz/ui` carried Indonesian and English labels side by side behind `locale` props. Two voices in one codebase meant every new screen had to pick one, and a full id/en translation layer would double every piece of copy before launch.

## Decision

Every app is English-only, with no i18n layer: `<html lang="en">`, English routes, copy, emails, page titles, errors, WeChat buyer messages and component defaults. American spelling, everywhere (UI, comments, docs, glossary). A casual "you".

A word stays Indonesian only when it passes one of three tests:

1. **Proper names:** PPIT Shenzhen, division names (Badan Pengurus Harian…) and badge codes (BPH, DANUS…), GumamChan.
2. **Insider words** members say in Indonesian even mid-English, with no clean English equivalent: **Panitia**, **Danus**, **Oprec**, **Kasir**. Shown plainly, without a gloss.
3. **The organization's own voice** on the main site: its about text, mission, division and event descriptions. Each content block carries a required language (`id` or `en`), chosen by its author, with no default; an Indonesian block is marked `lang="id"`.

Everything else is translated. Code identifiers and stored field names use the same word as the screen: `checkIn`, `announcement`, and the kept words as they are (`panitia`, `kasir`, `danus`).

Dates and numbers are US English with 24-hour times: "Sat, Nov 14", "Oct 13, 2026", "19:00 Shenzhen time (18:00 WIB)", "1,500", "¥12.50". `format.ts` keeps its `id` and `zh` locales for content blocks written in those languages.

## Consequences

- `STATUSES` and `OPREC_STAGES` hold one `label`; `Division.nameEn` is gone (divisions show their Indonesian name). `StatusBadge`, `LineBadge`, `ThemeControl`, `RouteTracker`, `DepartureBoard` and `CampusLine` lose their `locale` props. `ArticleCard` keeps `lang`, because that is the article's language.
- `LanguageSwitcher` stays in `@ppitsz/ui`, unused by the apps.
- Nothing had launched, so the routes were renamed without redirects.
- A screen-reader user hears Indonesian division names in Indonesian: `LineBadge` marks them `lang="id"`.
