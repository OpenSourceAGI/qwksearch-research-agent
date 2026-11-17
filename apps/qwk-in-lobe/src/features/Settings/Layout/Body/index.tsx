'use client';

import { Accordion, AccordionItem, Flexbox } from '@lobehub/ui';
import { Text } from '@lobehub/ui/base-ui';
import { createStaticStyles, cx } from 'antd-style';
import { memo, useMemo } from 'react';
import { Link } from 'react-router';

import NavItem from '@/features/NavPanel/components/NavItem';
import { getTabUrl, SearchSection } from '@/features/SettingsSearch';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { SettingsTabs } from '@/store/global/initialState';
import { isModifierClick } from '@/utils/navigation';

import { SettingsGroupKey, useCategory } from '../../hooks/useCategory';

const styles = createStaticStyles(({ css, cssVar }) => ({
  groupTitle: css`
    text-transform: uppercase;
    letter-spacing: 0.08em;
  `,
  link: css`
    position: relative;
    display: block;
  `,
  linkActive: css`
    &::before {
      content: '';

      position: absolute;
      z-index: 1;
      inset-block: 8px;
      inset-inline-start: 2px;

      width: 3px;
      border-radius: 999px;

      background: ${cssVar.colorPrimary};
    }
  `,
}));

const Body = memo(() => {
  const categoryGroups = useCategory();
  const navigate = useWorkspaceAwareNavigate();
  const location = useActiveLocation();

  // Extract current tab from pathname: /settings/profile -> profile
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split('/');
    // pathname is like /settings/profile or /settings/provider/xxx
    if (pathParts.length >= 3) {
      return pathParts[2] as SettingsTabs;
    }
    return SettingsTabs.Profile;
  }, [location.pathname]);

  return (
    <Flexbox gap={4} paddingInline={4}>
      <SearchSection>
        <Accordion
          gap={8}
          defaultExpandedKeys={[
            SettingsGroupKey.General,
            SettingsGroupKey.Subscription,
            SettingsGroupKey.Agent,
            SettingsGroupKey.System,
            SettingsGroupKey.Developer,
          ]}
        >
          {categoryGroups.map((group) => (
            <AccordionItem
              itemKey={group.key}
              key={group.key}
              paddingBlock={4}
              paddingInline={'8px 4px'}
              title={
                <Text
                  ellipsis
                  className={styles.groupTitle}
                  fontSize={11}
                  type={'secondary'}
                  weight={600}
                >
                  {group.title}
                </Text>
              }
            >
              <Flexbox gap={1} paddingBlock={1}>
                {group.items.map((item) => {
                  const url = item.href ?? getTabUrl(item.key);
                  return (
                    <Link
                      className={cx(styles.link, activeTab === item.key && styles.linkActive)}
                      key={item.key}
                      to={url}
                      onClick={(e) => {
                        if (isModifierClick(e)) return;
                        e.preventDefault();
                        navigate(url);
                      }}
                    >
                      <NavItem
                        active={activeTab === item.key}
                        icon={item.icon}
                        title={item.label}
                      />
                    </Link>
                  );
                })}
              </Flexbox>
            </AccordionItem>
          ))}
        </Accordion>
      </SearchSection>
    </Flexbox>
  );
});

export default Body;
