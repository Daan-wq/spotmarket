"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/routing";

const EXACT_TRANSLATIONS: Record<string, string> = {
  "Aangevraagd": "Requested",
  "Actief": "Active",
  "Actieve clippers": "Active clippers",
  "Actieve leads": "Active leads",
  "Acties": "Actions",
  "Alle netto bedragen uit uitbetalingsruns": "All net amounts from payout runs",
  "Alle statussen": "All statuses",
  "Annuleren": "Cancel",
  "Bedrag": "Amount",
  "Beheren": "Manage",
  "Betaalverzoeken": "Payment requests",
  "Bewijs": "Proof",
  "Bezoekers": "Visitors",
  "Bruto": "Gross",
  "Budget": "Budget",
  "Campagne": "Campaign",
  "Campagne maken": "Create campaign",
  "Campagne openen": "Open campaign",
  "Campagne bewerken": "Edit campaign",
  "Campagne-ops": "Campaign Ops",
  "Campagneacties": "Campaign actions",
  "Campagnes": "Campaigns",
  "Campagnetabel": "Campaign table",
  "Concept, betaling, review": "Draft, payment, review",
  "Creator": "Creator",
  "Creators": "Creators",
  "Details": "Details",
  "Financiele ops": "Financial ops",
  "Geen betaalverzoeken": "No payment requests",
  "Geen goedgekeurde onbetaalde inzendingen": "No approved unpaid submissions",
  "Geen merk gekoppeld": "No brand linked",
  "Geen referrerdata.": "No referrer data yet.",
  "Geen sessierecordinglinks.": "No session recording links yet.",
  "Geen site analytics": "No site analytics yet",
  "Gearchiveerd": "Archived",
  "Geconverteerd": "Converted",
  "Gebruiksbasis": "Usage base",
  "Gemeten routeviews": "Measured route views",
  "Goedgekeurd onbetaald": "Approved unpaid",
  "Goedgekeurd onbetaald werk": "Approved unpaid work",
  "Goedgekeurde views": "Approved views",
  "Handmatige bank- en USDC-Solana betaalverzoeken ingediend door clippers.": "Manual bank and USDC on Solana payment requests submitted by clippers.",
  "Handmatige overboekingen wachten": "Manual transfers waiting",
  "Inhoudingen": "Deductions",
  "Inzendingen": "Submissions",
  "Items": "Items",
  "Laatste sync:": "Last sync:",
  "Leaddatabase": "Lead database",
  "Methode": "Method",
  "Net": "Net",
  "Netto run-totaal": "Net run total",
  "Nieuwe uitbetalingsrun": "New payout run",
  "Nog geen campagnes": "No campaigns yet",
  "Nog geen paginadata.": "No page data yet.",
  "Nog geen site analytics": "No site analytics yet",
  "Nog geen uitbetalingsruns": "No payout runs yet",
  "Onboarding": "Onboarding",
  "Open uitbetalingsruns": "Open payout runs",
  "Openen": "Open",
  "Opdrachten": "Assignments",
  "Pageviews": "Pageviews",
  "Pipeline": "Pipeline",
  "PostHog is nog niet volledig geconfigureerd": "PostHog is not fully configured yet",
  "PostHog-sessie-ID's": "PostHog session IDs",
  "Productanalytics": "Product analytics",
  "Publiceren": "Publish",
  "Recente opnames": "Recent recordings",
  "Referrers en UTM's": "Referrers and UTMs",
  "Run": "Run",
  "Sales": "Sales",
  "Sessies": "Sessions",
  "Signupconversie": "Signup conversion",
  "Signupfunnel": "Signup funnel",
  "Site-analytics": "Site analytics",
  "Status": "Status",
  "Status en opschonen": "Status and cleanup",
  "Tijdlijn": "Timeline",
  "Toppagina's": "Top pages",
  "Uitbetalingen": "Payouts",
  "Uitbetalingsrun maken": "Create payout run",
  "Uitbetalingsruns": "Payout runs",
  "Unieke niet-admingebruikers": "Unique non-admin users",
};

const PATTERN_TRANSLATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /^Campagnes zitten nu in de flow van merk naar productie\. Merklink, opdrachten, inzendingen en publicatieacties blijven zichtbaar\.$/,
    replacement: "Campaigns now flow from brand to production. Brand links, assignments, submissions, and publishing actions stay visible.",
  },
  {
    pattern: /^Compacte adminweergave met merkeigenaarschap en productiedruk\.$/,
    replacement: "Compact admin view with brand ownership and production pressure.",
  },
  {
    pattern: /^Maak de eerste campagne zodra een merk is onboarded\.$/,
    replacement: "Create the first campaign once a brand is onboarded.",
  },
  {
    pattern: /^Bedrijven, groepen, categorieen, contacten en notities in een eenvoudige tabel\.$/,
    replacement: "Companies, groups, categories, contacts, and notes in one simple table.",
  },
  {
    pattern: /^Uitbetalingsruns groeperen goedgekeurd onbetaald werk per creator en periode, inclusief bonussen, inhoudingen, CSV-export, bewijs en betaalstatus\.$/,
    replacement: "Payout runs group approved unpaid work by creator and period, including bonuses, deductions, CSV export, proof, and payment status.",
  },
  {
    pattern: /^Nieuwe opnameverzoeken van clippers verschijnen hier voordat je ze handmatig overmaakt\.$/,
    replacement: "New withdrawal requests from clippers appear here before you transfer them manually.",
  },
  {
    pattern: /^Groepeer goedgekeurd onbetaald werk in een periodegebonden uitbetalingsrun\.$/,
    replacement: "Group approved unpaid work into a period-based payout run.",
  },
  {
    pattern: /^Wekelijkse of periodegebonden gegroepeerde uitbetalingsruns\.$/,
    replacement: "Weekly or period-based grouped payout runs.",
  },
  {
    pattern: /^Maak een run van goedgekeurd onbetaald werk\. De API kan items per creator en periode groeperen\.$/,
    replacement: "Create a run from approved unpaid work. The API can group items by creator and period.",
  },
  {
    pattern: /^Open bronmateriaal of legacy-records alleen wanneer uitbetalingswerk daarom vraagt\.$/,
    replacement: "Open source material or legacy records only when payout work requires it.",
  },
  {
    pattern: /^Bronmateriaal voor de volgende uitbetalingsrun\.$/,
    replacement: "Source material for the next payout run.",
  },
  {
    pattern: /^Al het goedgekeurde werk zit al in een uitbetalingsrun of er is geen goedgekeurd werk\.$/,
    replacement: "All approved work is already in a payout run, or there is no approved work.",
  },
  {
    pattern: /^Gebruikssignalen uit PostHog-snapshots, waarbij adminverkeer buiten de primaire cijfers blijft\.$/,
    replacement: "Usage signals from PostHog snapshots, with admin traffic excluded from primary metrics.",
  },
  {
    pattern: /^Primair sitegebruik over de laatste (\d+) dagen\.$/,
    replacement: "Primary site usage over the last $1 days.",
  },
  {
    pattern: /^Dagelijkse pageviews en signups uit opgeslagen snapshots\.$/,
    replacement: "Daily pageviews and signups from stored snapshots.",
  },
  {
    pattern: /^(\d+) inzendingen nog niet in een run$/,
    replacement: "$1 submissions not in a run yet",
  },
  {
    pattern: /^(\d+) signup-events$/,
    replacement: "$1 signup events",
  },
  {
    pattern: /^(\d+) voltooiingen$/,
    replacement: "$1 completions",
  },
];

interface AdminLocaleDomTranslatorProps {
  locale: Locale;
}

export function AdminLocaleDomTranslator({ locale }: AdminLocaleDomTranslatorProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (locale !== "en") return;

    const translate = () => translateRoot(document.body);
    translate();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(translate);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title"],
    });

    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}

function translateRoot(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    if (current instanceof Text && shouldTranslateNode(current)) {
      textNodes.push(current);
    }
    current = walker.nextNode();
  }

  for (const node of textNodes) {
    const translated = translateValue(node.nodeValue ?? "");
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  for (const element of root.querySelectorAll<HTMLElement>("[aria-label], [placeholder], [title]")) {
    for (const attribute of ["aria-label", "placeholder", "title"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const translated = translateValue(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
  }
}

function shouldTranslateNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return false;
  return !["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName);
}

function translateValue(value: string) {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();
  if (!core) return value;

  const exact = EXACT_TRANSLATIONS[core];
  if (exact) return `${leading}${exact}${trailing}`;

  for (const { pattern, replacement } of PATTERN_TRANSLATIONS) {
    if (pattern.test(core)) {
      return `${leading}${core.replace(pattern, replacement)}${trailing}`;
    }
  }

  return value;
}
