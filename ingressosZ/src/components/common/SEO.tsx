import { Helmet } from "@dr.pogodin/react-helmet";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "event";
  jsonLd?: Record<string, unknown>;
}

export function SEO({
  title,
  description = "IngressosZ — Ingressos rápidos e seguros",
  image = "/pwa-512.png",
  url,
  type = "website",
  jsonLd,
}: SEOProps) {
  const siteUrl = window.location.origin;
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const fullImage = image.startsWith("http") ? image : `${siteUrl}${image}`;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* JSON-LD Schema */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
