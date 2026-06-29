import { useEffect } from "react";
import type { Event } from "../../types";

function upsertMeta(key: "name" | "property", id: string, content: string) {
  let tag = document.querySelector(
    `meta[${key}='${id}']`
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(key, id);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setCanonical(eventId: string) {
  const canonical = document.querySelector(
    "link[rel='canonical']"
  ) as HTMLLinkElement | null;

  if (canonical) canonical.href = `/evento/${eventId}`;
}

function getStartDateIso(event: Event) {
  if (!event.date) return undefined;

  const datePart = new Date(event.date);
  const [hh, mm] = (event.time || "19:00").slice(0, 5).split(":");
  datePart.setHours(Number(hh), Number(mm), 0, 0);
  return datePart.toISOString();
}

function buildJsonLd(event: Event, eventId: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description,
    startDate: getStartDateIso(event),
    eventStatus: "https://schema.org/EventScheduled",
    image: event.image ? [event.image] : undefined,
    location: event.location
      ? { "@type": "Place", name: event.location }
      : undefined,
    offers: {
      "@type": "Offer",
      price: event.price ?? 0,
      priceCurrency: "BRL",
      availability:
        (event.availableTickets ?? 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: window.location.origin + `/evento/${eventId}`,
    },
  };
}

function setEventJsonLd(event: Event, eventId: string, description: string) {
  let script = document.getElementById(
    "jsonld-event"
  ) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.id = "jsonld-event";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.text = JSON.stringify(buildJsonLd(event, eventId, description));
}

export function useEventSEO(event: Event | null, eventId: string | undefined) {
  useEffect(() => {
    if (!event || !eventId) return;

    const title = `${event.title} — IngressosZ`;
    const description =
      event.description ||
      "Detalhes do evento, horários, local e compra de ingressos.";

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", event.image || "/pwa-512.png");
    setCanonical(eventId);
    setEventJsonLd(event, eventId, description);
  }, [event, eventId]);
}
