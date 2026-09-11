# WSJ27 Sources and Update Reference

This file records every source this skill was built from, what each covered, when it was last checked, and how to update the skill. WSJ27 facts change as the event approaches – fees, deadlines, numbers, program details, and even page structure shift between Bulletins – so this skill is meant to be refreshed periodically.

## Table of Contents

1. [Last Checked](#last-checked)
2. [Sources](#sources)
3. [Known Discrepancies to Watch](#known-discrepancies-to-watch)
4. [Settled – Do Not Reopen](#settled--do-not-reopen)
5. [How to Update This Skill](#how-to-update-this-skill)

## Last Checked

- Skill built: 22 July 2026 (version 1.0).
- Sources last checked: 22 July 2026 (against the Bulletin 1–4 PDFs).
- Newest source: official Bulletin 4, July 2026 (156 pages).

## Sources

Official jamboree (host side):

- <https://www.jamboree2027.org> and its subpages – the official site. Covers event identity, dates, venue, theme, program, eligibility, scale, organizing bodies, news, and contacts. Basis for `jamboree2027-official-reference.md` and parts of `program-and-activities-reference.md`.
- HoC Base (Heads of Contingent Base), the official digital Bulletin platform at <https://knowledge.wsj2027.pl/display/HOC> – the central, continuously-updated home for all current documents, updates, resources, and templates. The Bulletins now live here as the primary source; the PDFs below remain downloadable for offline use. Access is limited to Heads of Contingent (login-gated), so current documents may need to be supplied by a HOC.
- Official Bulletins (still-downloadable PDFs). The local copies are:
  - Bulletin 1, August 2024 (48 pages) – event basics, theme and objectives, program components, preparation timeline, Safe from Harm, fees, contingent formation, full Terms and Conditions.
  - Bulletin 2, April 2025 (71 pages) – expanded program and modules, branding, contingent building, IST experience, updated fees and timeline.
  - Bulletin 3, November 2025 (136 pages; released 5 December 2025). Added detailed program modules, symbolic framework (Companions), site logistics, IST program and training, food, health and safety, Safe from Harm, accessibility, subcamp life, sustainability, insurance, and updated Terms and Conditions. ISBN 978-83-972705-3-4.
  - Bulletin 4, July 2026 (156 pages) – the current authoritative Bulletin. Adds detailed arrival logistics, the detailed Modular Programme, the Pre-Jamboree Task, IST free time and the IST Programme, cargo shipping and customs, Codes of Conduct for adults and youth, and a detailed site map; it reaffirms the dates, fees, payment schedule, HOC-meeting dates, and the 3,600 contingent cap.
  - Bulletin 5 is expected around February 2027.

Swedish contingent (Scouterna):

- <https://www.scouterna.se/k/wsj27-polen/> and its subpages – the Swedish contingent section. Live subpages at build time: /om-wsj, /deltagare, /ledare, /ist (and /ist/foodhouse). Basis for `swedish-contingent-guide.md`. Several /info/ subpages returned 404.
- "Ansöknings- och anmälningsvillkor" (Application and Registration Terms), PDF, media.scoutcontent.se/uploads/2025/11/Ansokningsvillkor-WSJ-2027.pdf – Swedish fees, deadlines, eligibility, and terms. Basis for `costs-and-registration-reference.md`.
- "Hantering av personuppgifter i samband med WSJ27" (personal-data handling), PDF, media.scoutcontent.se/uploads/2025/11/Hantering-av-personuppgifter-i-samband-med-WSJ27.pdf.

## Known Discrepancies to Watch

These were unresolved at build time; check whether newer sources settle them:

- Total attendance: the website markets up to 50,000 total attendees (participants, volunteers, and day visitors); the Bulletins give no single figure (Bulletin 4 says only "tens of thousands"), and the Polish resident page cites about 48,000. The per-contingent cap (10% of participants, max 3,600) is an absolute ceiling on one contingent and does not fix the event total. A WOSM/host planning review continues at intervals and may change the numbers.
- Ordinal: the correct ordinal is 26th; some earlier materials showed 27th, but current official pages consistently use 26th.
- Opening date: core dates are 30 July – 8 August, but one Bulletin 3 schedule grid shows arrivals 30 July and Opening Ceremony 31 July. Treat the Terms and Conditions dates as authoritative.
- Swedish leader acceptance-notice timing is stated inconsistently (spring vs May, year unclear).
- IST arrival: Bulletin 4 states 27 July; Bulletin 3 and the Jamboree Dates page said 27–28 July. Bulletin 4 is the newer source.
- Bulletin 1 date: Bulletin 1's cover reads August 2024, while Bulletin 4's preparation timeline lists it under July; the cover date (August 2024) is used here.

## Settled – Do Not Reopen

- **There are four hubs: Yellow, Red, Green, Purple.** Four subcamps each, 16 in total. The Symbolic Framework paragraph in Bulletins 3 and 4 says the hubs are "named after five colours", but that paragraph was copied verbatim between the two and is simply wrong: the hubs are named explicitly, four is what the 16-subcamp math gives, and no fifth hub or color appears anywhere in Bulletins 1–4 (the IST campsite is separate and uncolored). A future Bulletin repeating "five colours" does not reopen this.

## How to Update This Skill

When asked to check for updates:

1. Re-crawl <https://www.jamboree2027.org> and <https://www.scouterna.se/k/wsj27-polen/> (and their subpages), and check the digital HoC Base platform (<https://knowledge.wsj2027.pl/display/HOC>) for the newest documents and any Bulletin newer than the one under [Last Checked](#last-checked); read the Swedish terms PDFs. HoC Base access is limited to Heads of Contingent, so ask the user to supply current documents or newer Bulletin PDFs if you cannot reach it.
2. Diff findings against the current reference files. Pay special attention to fees, payment deadlines, participant numbers, program changes, and the discrepancies above.
3. Update changed facts in the relevant reference file, keeping the source attribution and the official-versus-Swedish separation. Follow the cross-cutting style: American English, en-dash for breaks and ranges (never an em-dash), and a blank line before every list.
4. Update this file: refresh [Last Checked](#last-checked), note the newest Bulletin, and record any resolved or new discrepancies.
5. Bump `metadata.version` in `SKILL.md` (minor for refreshes, major for a restructuring), and update the Key Context in `SKILL.md` if headline facts changed.
