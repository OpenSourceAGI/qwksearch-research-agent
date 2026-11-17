export const LOBE_THEME_PRIMARY_COLOR = 'LOBE_THEME_PRIMARY_COLOR';

export const LOBE_THEME_NEUTRAL_COLOR = 'LOBE_THEME_NEUTRAL_COLOR';

/**
 * QwkSearch's own look. The globe-and-nodes logo is orange on a cool slate
 * ground, so those are the default primary and neutral scales; users can still
 * pick others in Settings > Appearance.
 */
export const QWKSEARCH_THEME = {
  fontFamily: 'Plus Jakarta Sans',
  fontURL:
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  neutralColor: 'slate',
  primaryColor: 'orange',
  token: {
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 6,
    borderRadiusXS: 4,
    fontWeightStrong: 650,
  },
} as const;
