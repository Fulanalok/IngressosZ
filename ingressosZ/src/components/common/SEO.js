import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Helmet } from "react-helmet-async";
export function SEO({ title, description = "IngressosZ — Ingressos rápidos e seguros", image = "/vite.svg", url, type = "website", jsonLd, }) {
    const siteUrl = window.location.origin;
    const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
    const fullImage = image.startsWith("http") ? image : `${siteUrl}${image}`;
    return (_jsxs(Helmet, { children: [_jsx("title", { children: title }), _jsx("meta", { name: "description", content: description }), _jsx("link", { rel: "canonical", href: fullUrl }), _jsx("meta", { property: "og:type", content: type }), _jsx("meta", { property: "og:url", content: fullUrl }), _jsx("meta", { property: "og:title", content: title }), _jsx("meta", { property: "og:description", content: description }), _jsx("meta", { property: "og:image", content: fullImage }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:url", content: fullUrl }), _jsx("meta", { name: "twitter:title", content: title }), _jsx("meta", { name: "twitter:description", content: description }), _jsx("meta", { name: "twitter:image", content: fullImage }), jsonLd && (_jsx("script", { type: "application/ld+json", children: JSON.stringify(jsonLd) }))] }));
}
