import { createStaticStyles } from 'antd-style';
import { memo } from 'react';

const styles = createStaticStyles(({ css }) => ({
  /**
   * One frame for every character. Generated artwork arrives cropped to the
   * subject, and the built-in catalog draws its character across the frame with
   * a few percent of margin, so sizing by height lands both at the same stature.
   * Anchored deep enough that the lower body passes behind the first card — the
   * character leans on the surface instead of standing on it. The offset is what
   * sets how much shows: 94px leaves `HOME_PORTRAIT_VISIBLE_RATIO` of the
   * character above the card (see ./portraitFraming), which clears the catalog
   * mascot's head — it is half its own height — and reaches the hem on a
   * standing figure, where 57% cut both at the collar and the waist. Change one
   * and the studio's preview frame stops matching what home shows.
   */
  image: css`
    pointer-events: none;

    position: absolute;
    inset-block-end: -94px;
    inset-inline-end: 12px;

    width: 176px;
    height: 200px;

    object-fit: contain;
    object-position: bottom;
  `,
  root: css`
    position: relative;
    height: 100%;
  `,
}));

interface HomePortraitProps {
  /** The artwork to draw — Home resolves it (see ./useHomePortraitHero). */
  hero: string;
}

const HomePortrait = memo<HomePortraitProps>(({ hero }) => (
  <div className={styles.root}>
    <img aria-hidden alt="" className={styles.image} key={hero} src={hero} />
  </div>
));

export default HomePortrait;
