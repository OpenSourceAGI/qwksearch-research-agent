import { createStaticStyles } from 'antd-style';

/**
 * QwkSearch settings page look: every setting group (an antd Collapse under
 * lobe-ui's Form.Group) becomes a bordered card with a brand accent on its
 * title, on a softly tinted page.
 */
export const settingsStyles = createStaticStyles(({ css, cssVar }) => ({
  page: css`
    background:
      radial-gradient(
        1200px 320px at 50% -120px,
        color-mix(in srgb, ${cssVar.colorPrimary} 9%, transparent),
        transparent 70%
      ),
      ${cssVar.colorBgContainer} !important;

    .ant-collapse {
      overflow: hidden;

      border: 1px solid ${cssVar.colorBorderSecondary};
      border-radius: ${cssVar.borderRadiusLG} !important;

      box-shadow:
        0 1px 2px rgb(15 23 42 / 4%),
        0 8px 24px -12px rgb(15 23 42 / 12%);

      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &:hover {
        border-color: color-mix(
          in srgb,
          ${cssVar.colorPrimary} 35%,
          ${cssVar.colorBorderSecondary}
        );
      }
    }

    .ant-collapse > .ant-collapse-item > .ant-collapse-header {
      position: relative;
      padding-inline-start: 28px !important;
      font-weight: 650;

      &::before {
        content: '';

        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 14px;
        transform: translateY(-50%);

        width: 4px;
        height: 16px;
        border-radius: 999px;

        background: ${cssVar.colorPrimary};
      }
    }
  `,
}));
