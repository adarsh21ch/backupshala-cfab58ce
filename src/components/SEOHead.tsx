import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  path?: string;
}

const SEOHead = ({ title, description, ogImage, path }: SEOHeadProps) => {
  const fullTitle = title.includes('Backupshala') ? title : `${title} — Backupshala`;
  const desc = description || 'Learn digital skills from expert creators on Backupshala — India\'s course marketplace for video editing, content creation, freelancing & more.';
  const url = path ? `https://backupshala.lovable.app${path}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:type" content="website" />
    </Helmet>
  );
};

export default SEOHead;
