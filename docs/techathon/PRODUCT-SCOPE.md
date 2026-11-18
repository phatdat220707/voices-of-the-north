# Product and demo scope for the next integrated candidate

Dat's scope review, prepared **18 November 2026** for Issues #2, #6 and #7. This consolidates the existing plan and Douglas's review draft. New map/media proposals remain pending; it is not an instruction to add them to the current build. Technical review and merge still follow [AGENTS.md](../../AGENTS.md).

## One product and three paths

Keep **Voices of the North** as the working name. Preserve Hong Kong community memory, with the Northern Metropolis as the initial focus. Oral audio and its reviewed transcript are the primary evidence; photos/video can supplement them. The bundled 14 stories remain labelled role-play samples unless separately replaced through approved content handling.

1. **Visitor:** browse approved public stories -> story detail -> listen/read -> Ask the Village -> follow the cited audio segment or receive an unsupported-question refusal.
2. **Invited contributor:** server-verified sign-in -> consent -> recording -> transcription -> transcript/time/sharing review -> private submission. Review is separate from consent. Retry/cancel paths preserve the draft and do not imply successful publication.
3. **Reviewer:** inspect pending material -> approve/reject -> publish approved public material. Owner/reviewer withdrawal must update actual visibility, old audio access and the correct local badge only after acknowledgement. Failed actions preserve the prior state.

Ask a Story is the already-merged **local** question pin -> bound recording-context demo. It solicits new human stories; Ask the Village reads existing authorized stories. It does not establish anonymous server posting, a shared question forum or direct publication. Its voice answers still use the contribution/moderation path.

## Demonstration sequence

Use a synthetic submission with its own recording ID; never reuse a reserved corpus ID such as YL-001 as a recording ID. Keep test identities private.

1. Open one labelled public sample with real audio and a tested timestamp source; show a refusal for a question without evidence.
2. Show contributor consent, recording/transcript review and a private pending submission. Label a stub transcript as a stub; only call transcription real after a real service run is recorded.
3. A separate reviewer approves it. A clean guest session can now find and play the approved public story.
4. Withdraw it. Demonstrate its removal from guest catalog/map/Ask and old audio access, plus the correct contributor state. The saved-override repair has local evidence on e038d82; demonstrate it against the named integrated/deployed candidate before making a hosted claim.
5. Show local Ask a Story -> recorder handoff as a separate optional interaction. Describe its local-only scope.
6. A consent-cleared interview excerpt or optional media can enrich the presentation after source/use review. An unavailable-media state must remain honest; a fallback screenshot does not prove successful playback.

Use this as a flow, not an assumed competition pitch duration. Douglas verifies the portal's actual presentation format. Dat approves a timed script and selected excerpts after evidence is available.

## Douglas's historical-map PRD: review result

The objective of showing a place changing over time is worth evaluating. The implementation and budget are **not approved**. First resolve:

| Review item | Evidence needed before implementation approval |
| --- | --- |
| Geographic data | One proposed location, two genuinely dated sources, actual coverage, source/licence/attribution and whether rehosting/tiling/demo redistribution is permitted |
| Time control | Explicit mapping from the story-era selection to the imagery date, plus truthful no-coverage/no-date UI; three images cannot silently claim five distinct historical dates |
| Rendering | Compare adding a historical image/raster layer to the existing MapLibre path before claiming that a Mapbox migration is required |
| 2D vs 3D | State whether the output is a dated 2D aerial image, present-day 3D context, or a sourced historical 3D model; do not imply one proves another |
| Migration work | Account for SDK/style interactions, custom layers, controls and real failure fallback; do not assume changing a URL/token is complete integration |
| Cost | Correct the nonexistent provider-enforced Mapbox hard cap; size actual source files, processing, tile hosting and usage separately; no card/token/service activation yet |

Source checks on Nov 18:

- [MapLibre's raster-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/) establishes a supported technical path to test; it does not establish the selected imagery's rights, alignment or performance.
- [Mapbox's billing FAQ](https://docs.mapbox.com/accounts/faq/can-i-set-up-a-cap-for-monthly-spending/) confirms alerts do not stop service at a chosen monthly spend.
- [LandsD orthophoto documentation](https://www.landsd.gov.hk/en/survey-mapping/mapping/aerial-photo-photogrammetric-products/digital-orthophoto.html) describes different geographic coverage for 1963, 1976 and 1982. In particular, the 1976 description does not establish blanket North District coverage. Check the chosen sheet/location; do not promise three years for every northern village. This review has not downloaded or cleared any specific tile.

Recommended next review artifact: one location/two-source comparison proposal with source dates, coverage, rights, expected visual result and effort. This is a research/design handoff, not a new implementation assignment or purchase approval. Keep full renderer migration, geocoding, Static Images/MTS and historical 3D outside the current staging acceptance.

## Interview inclusion checklist

Steven/Douglas's new interview is **reported, not reviewed for release**. Dat still needs a private media link or file, selected timestamps, a transcript/translation sufficient for review and confirmation of the participant's agreed uses. A public-safe readiness note can say approved/not reviewed; keep personal data, raw media and consent records outside GitHub.

- Distinguish a real personal recollection, a scripted reading and AI-generated material. Never relabel a scripted voice-over as market validation or an authentic personal memory.
- Confirm separate permission for internal review, competition demo/video/deck, and public archive as applicable. Lack of response is not consent.
- Confirm the desired name/pseudonym, location granularity and redactions. Check third-party identities and photo/video rights.
- Review the exact excerpt, transcript meaning and playback/source timing. Use the reviewed excerpt and state its scope honestly.
- Keep a takedown contact and a way to remove the excerpt from any public deployment. New real interviews go through moderation; do not commit raw material merely to make it available for demo.

## Claims for the pitch

Say which source/commit/environment supports the statement. Current evidence supports the selected local synthetic pipeline checks and documented source-linked retrieval, within their tested scope. Hosted OIDC/storage/recovery and full phone/browser acceptance remain pending. UI language support, speech recognition languages and transcript translation are separate capabilities; a three-language UI does not establish trilingual speech accuracy. Avoid absolute zero-hallucination or legal-compliance claims and untested pricing/demand/partnership assertions. AI critique helps review a pitch; it is not user research.
