# Brand Portal Dashboard en PDF-rapport

## Goal
Maak de campagnekeuze portal-breed, verplaats alle interactieve rapportdata naar het branddashboard en laat `/brand/reports` uitsluitend definitieve rapporten als A4-preview met PDF-download tonen.

## Tasks
- [x] Voeg een vaste portal-brede campagneselector toe die `campaignId` bewaart bij navigatie tussen Dashboard, Content en Rapporten. Verify: wisselen op een pagina stuurt alle navigatielinks naar dezelfde campagne.
- [x] Verwijder dubbele campagneselectors uit Dashboard en Content. Verify: alleen de vaste selector bovenaan blijft zichtbaar.
- [x] Breid de veilige dashboardprojectie uit met creators, audience, budget/value en kwaliteitsstatus. Verify: geen payouts, raw signalen of interne QC-data komen in de brand payload.
- [x] Breid het dashboard uit met interactieve modules voor alle rapportdata, zonder redactionele learnings of aanbevelingen. Verify: performance, content, platforms, creators, audience, budget en quality zijn zichtbaar wanneer data bestaat.
- [x] Bouw `/brand/reports` om naar campagnegebonden definitieve rapportselectie en A4-preview. Verify: alleen `FINAL + visibleToBrand` rapporten van de geselecteerde campagne worden geladen.
- [x] Houd meerdere rapporten per campagne voorbereid via optionele `reportId`-selectie en laat oude `/brand/reports/[reportId]` links doorsturen. Verify: de nieuwste publicatie is standaard en een expliciet rapport blijft selecteerbaar.
- [x] Maak de rapportactie expliciet `PDF downloaden` en zorg dat print alleen het A4-document bevat. Verify: browser-print opent met het rapport zonder portal-chrome.
- [ ] Werk unit/static tests bij en voer types, gerichte tests en build uit. Verify: alle checks slagen.
- [ ] Commit, push en deploy een nieuwe preview zonder productie te wijzigen. Verify: ingelogde brandroutes laden zonder database- of runtime-500.

## Done When
- [x] Eén campagneselectie bestuurt de hele Brand Portal.
- [x] Dashboard bevat alle interactieve rapportdata, maar geen redactionele rapportcopy.
- [x] Rapporten toont alleen definitieve A4-rapporten en ondersteunt PDF-download.
- [ ] Preview is bereikbaar en getest; productie wacht op expliciete goedkeuring.

## Notes
- Geen nieuwe Prisma-migratie nodig.
- De bestaande live report-aggregatie blijft de enige bron voor dashboard- en rapportdata.
- Lege of onbetrouwbare modules worden niet getoond.
