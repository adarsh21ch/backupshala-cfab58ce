import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  path?: string;
  /** Optional structured data (JSON-LD) — pass a plain object */
  jsonLd?: Record<string, unknown>;
  /** Set true on auth/dashboard pages to keep them out of search indexes */
  noIndex?: boolean;
}

const SITE = 'https://backupshala.com';

const SEOHead = ({ title, description, ogImage, path, jsonLd, noIndex }: SEOHeadProps) => {
  const fullTitle = title.includes('Backupshala') ? title : `${title} — Backupshala`;
  const desc = description || "Learn digital skills from expert creators on Backupshala — India's course marketplace for video editing, content creation, freelancing & more.";
  const url = path ? `${SITE}${path}` : SITE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Backupshala" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
