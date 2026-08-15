/* ══════════════════════════════════════════════════════════════
   Beispielzeilen für die namentliche Kundenliste.

   /inplicit ist ohne Passwort erreichbar, also ist alles in dieser
   Datei veröffentlicht — sie steht im Client-Bundle und im öffentlichen
   Repo. Deshalb stehen hier bewusst nur Platzhalter, die die Mechanik
   zeigen: Direktkunde gegen Channel-Partner, ein überschriebener
   Pilotpreis, ein Abo mit abgeschaltetem Expand, eine Notiz.

   Echte Namen gehören nicht hierher. Trag sie im Tool ein — der Stand
   bleibt über „Link kopieren" in der URL und über die gespeicherten
   Szenarien im Browser erhalten, ohne je in dieses Repo zu wandern.
   ══════════════════════════════════════════════════════════════ */

import { newCustomer, type Customer, type CustomerType, type Segment } from "./plan";

export const ROSTER: Customer[] = (
  [
    ["Kammer / Verband", "channel", "enterprise", 1, "Multiplikator in die Mitgliederbasis"],
    ["Beratungshaus", "channel", "enterprise", 3, "Lizenziert für eigene Mandate"],
    ["Hochschule", "channel", "enterprise", 5, "Forschungskooperation"],
    ["Ingenieurbüro", "direct", "mittelstand", 0, "Erster Design-Partner"],
    ["Konsumgütermarke", "direct", "mittelstand", 2, ""],
    ["Softwaredienstleister", "direct", "mittelstand", 4, ""],
    ["Energieversorger", "direct", "enterprise", 6, ""],
    ["Logistikkonzern", "direct", "enterprise", 8, ""],
    ["Maschinenbauer", "direct", "enterprise", 10, ""],
    ["Handelsgruppe", "direct", "enterprise", 12, ""],
  ] as const
).map(([name, type, segment, pilotMonth, note], i) =>
  newCustomer({
    id: `seed-${i}`,
    name,
    type: type as CustomerType,
    segment: segment as Segment,
    pilotMonth,
    // Direktkunden konvertieren angenommen zwei Quartale nach dem Piloten;
    // bei allem, woran du nicht glaubst, den Monat leeren.
    subMonth: type === "direct" ? Math.min(16, pilotMonth + 6) : null,
    note,
  }),
);
