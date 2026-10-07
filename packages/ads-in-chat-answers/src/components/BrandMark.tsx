import type { CSSProperties } from 'react';

/** A stable hue per string, so a brand's fallback mark keeps its colour. */
export function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

/** The round logo in the ad header; the advertiser's initial when there is no logo. */
export function BrandMark({ name, logoUrl, size = 28 }: { name: string; logoUrl?: string; size?: number }) {
  const style: CSSProperties = { width: size, height: size };
  if (logoUrl) {
    return <img className="qads-brand-mark" src={logoUrl} alt="" style={style} />;
  }
  return (
    <span
      className="qads-brand-mark qads-brand-mark--initial"
      aria-hidden="true"
      style={{ ...style, background: `hsl(${hueFor(name)} 55% 42%)`, fontSize: size * 0.45 }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/**
 * The product image, or a typographic cover drawn from the title when the
 * advertiser gave none — a broken image in an ad looks worse than no ad.
 */
export function ProductImage({ title, imageUrl }: { title: string; imageUrl?: string }) {
  if (imageUrl) {
    return <img className="qads-product-image" src={imageUrl} alt="" loading="lazy" />;
  }
  const hue = hueFor(title);
  return (
    <div className="qads-product-image qads-product-cover" aria-hidden="true">
      <div className="qads-cover-page" style={{ borderTopColor: `hsl(${hue} 70% 50%)` }}>
        <span className="qads-cover-dot" style={{ background: `hsl(${hue} 75% 52%)` }} />
        <span className="qads-cover-title">{title.split(/[:(]/)[0]}</span>
      </div>
    </div>
  );
}
