import { useEffect } from "react";
export function useEventSEO(event, eventId) {
    useEffect(() => {
        if (!event || !eventId)
            return;
        const title = `${event.title} — IngressosZ`;
        const description = event.description ||
            "Detalhes do evento, horários, local e compra de ingressos.";
        document.title = title;
        const upsertMeta = (key, id, content) => {
            let tag = document.querySelector(`meta[${key}='${id}']`);
            if (!tag) {
                tag = document.createElement("meta");
                tag.setAttribute(key, id);
                document.head.appendChild(tag);
            }
            tag.setAttribute("content", content);
        };
        upsertMeta("name", "description", description);
        upsertMeta("property", "og:title", title);
        upsertMeta("property", "og:description", description);
        upsertMeta("property", "og:image", event.image || "/vite.svg");
        const canonical = document.querySelector("link[rel='canonical']");
        if (canonical)
            canonical.href = `/evento/${eventId}`;
        const startDateIso = (() => {
            if (!event.date)
                return undefined;
            const datePart = new Date(event.date);
            const time = (event.time || "19:00").slice(0, 5);
            const [hh, mm] = time.split(":");
            datePart.setHours(Number(hh), Number(mm), 0, 0);
            return datePart.toISOString();
        })();
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.title,
            description: description,
            startDate: startDateIso,
            eventStatus: "https://schema.org/EventScheduled",
            image: event.image ? [event.image] : undefined,
            location: event.location
                ? { "@type": "Place", name: event.location }
                : undefined,
            offers: {
                "@type": "Offer",
                price: event.price ?? 0,
                priceCurrency: "BRL",
                availability: (event.availableTickets ?? 0) > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/SoldOut",
                url: window.location.origin + `/evento/${eventId}`,
            },
        };
        let script = document.getElementById("jsonld-event");
        if (!script) {
            script = document.createElement("script");
            script.id = "jsonld-event";
            script.type = "application/ld+json";
            document.head.appendChild(script);
        }
        script.text = JSON.stringify(jsonLd);
        return () => {
            // Cleanup opcional
        };
    }, [event, eventId]);
}
