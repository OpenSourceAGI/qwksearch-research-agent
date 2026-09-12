'use client';

import { type FormGroupItemType } from '@lobehub/ui';
import { Flexbox, Form, InputNumber } from '@lobehub/ui';
import { Button, Select, Skeleton, Text, toast } from '@lobehub/ui/base-ui';
import { Form as AntdForm } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { LanguageSelect, OrderedMultiSelect } from '@/features/Settings/qwksearch';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';

import {
  fetchSearchSettings,
  resetSearchSettings,
  saveSearchSettings,
  SearchSettingsApiError,
  type SearchSettingsResponse,
} from '../api';
import {
  EMPTY_FORM_VALUES,
  formValuesFromResponse,
  hasAnyOverride,
  INHERIT,
  isFormDirty,
  overridesFromFormValues,
  type SearchFormValues,
} from '../formState';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? '');

/**
 * The pane needs a signed-in user, so a 401 is the expected first response for
 * a signed-out visitor rather than a failure worth showing raw. Recognised here
 * because `SearchSettingsApiError` already carries the status.
 */
const isUnauthorized = (error: unknown) =>
  error instanceof SearchSettingsApiError && error.status === 401;

const SearchForm = () => {
  const { t } = useTranslation('qwksearch');
  const [form] = AntdForm.useForm<SearchFormValues>();

  const [settings, setSettings] = useState<SearchSettingsResponse>();
  const [loadError, setLoadError] = useState<string>();
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const values = AntdForm.useWatch([], form);

  // Render the response rather than the form's optimistic state: `PUT` echoes
  // what survived validation, so an unknown category or an out-of-range cap
  // comes back trimmed and the inputs must follow it.
  const apply = useCallback(
    (response: SearchSettingsResponse) => {
      setSettings(response);
      form.setFieldsValue(formValuesFromResponse(response));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;

    fetchSearchSettings()
      .then((response) => {
        if (!cancelled) apply(response);
      })
      .catch((error) => {
        if (cancelled) return;
        setNeedsLogin(isUnauthorized(error));
        setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apply]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      apply(await saveSearchSettings(overridesFromFormValues(form.getFieldsValue())));
      toast.success(t('search.saved'));
    } catch (error) {
      toast.error(
        isUnauthorized(error)
          ? t('search.error.loginRequired')
          : t('search.saveFailed', { error: errorMessage(error) }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [apply, form, t]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    try {
      apply(await resetSearchSettings());
      toast.success(t('search.reset'));
    } catch (error) {
      toast.error(
        isUnauthorized(error)
          ? t('search.error.loginRequired')
          : t('search.saveFailed', { error: errorMessage(error) }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [apply, t]);

  const handleRevert = useCallback(() => {
    form.setFieldsValue(settings ? formValuesFromResponse(settings) : EMPTY_FORM_VALUES);
  }, [form, settings]);

  if (isLoading) return <Skeleton.Text rows={8} />;

  if (!settings) {
    return (
      <Flexbox gap={8} paddingBlock={24}>
        <Text type={'danger'}>
          {needsLogin ? t('search.error.loginRequired') : t('search.error.load')}
        </Text>
        {!needsLogin && loadError && <Text type={'secondary'}>{loadError}</Text>}
      </Flexbox>
    );
  }

  const { effective, options } = settings;

  const inheritOption = { label: t('search.inherit'), value: INHERIT };

  /** A three-way select: inherit, on, off. A Switch cannot say all three. */
  const triStateOptions = [
    inheritOption,
    { label: t('search.toggle.on'), value: 'on' },
    { label: t('search.toggle.off'), value: 'off' },
  ];

  const sources: FormGroupItemType = {
    children: [
      {
        children: (
          <OrderedMultiSelect
            placeholder={t('search.categories.placeholder')}
            options={options.categories.map((category) => ({
              label: t(`search.category.${category}` as any, category),
              value: category,
            }))}
          />
        ),
        desc: t('search.categories.desc', { value: effective.categories.join(', ') }),
        label: (
          <SettingsSearchAnchor id={'search-categories'}>
            {t('search.categories.label')}
          </SettingsSearchAnchor>
        ),
        name: 'categories',
      },
      {
        children: (
          <InputNumber
            max={options.maxMaxCategories}
            min={options.minMaxCategories}
            placeholder={String(effective.maxCategories)}
            style={{ width: 140 }}
          />
        ),
        desc: t('search.maxCategories.desc', {
          max: options.maxMaxCategories,
          min: options.minMaxCategories,
          value: effective.maxCategories,
        }),
        label: (
          <SettingsSearchAnchor id={'search-max-categories'}>
            {t('search.maxCategories.label')}
          </SettingsSearchAnchor>
        ),
        name: 'maxCategories',
      },
      {
        children: <Select options={triStateOptions} />,
        desc: t('search.publicInstances.desc'),
        label: (
          <SettingsSearchAnchor id={'search-public-instances'}>
            {t('search.publicInstances.label')}
          </SettingsSearchAnchor>
        ),
        name: 'publicInstances',
      },
    ],
    title: t('search.group.sources'),
  };

  const results: FormGroupItemType = {
    children: [
      {
        children: (
          <Select
            options={[
              inheritOption,
              ...options.timeRanges.map((range) => ({
                label: t(`search.timeRange.${range}` as any, range),
                value: range,
              })),
            ]}
          />
        ),
        desc: t('search.timeRange.desc', {
          value: effective.timeRange
            ? t(`search.timeRange.${effective.timeRange}` as any, effective.timeRange)
            : t('search.timeRange.none'),
        }),
        label: (
          <SettingsSearchAnchor id={'search-time-range'}>
            {t('search.timeRange.label')}
          </SettingsSearchAnchor>
        ),
        name: 'timeRange',
      },
      {
        children: <LanguageSelect placeholder={effective.language} />,
        desc: t('search.language.desc', { value: effective.language }),
        label: (
          <SettingsSearchAnchor id={'search-language'}>
            {t('search.language.label')}
          </SettingsSearchAnchor>
        ),
        name: 'language',
      },
      {
        children: (
          <InputNumber
            max={options.maxResultLimit}
            min={options.minResultLimit}
            style={{ width: 140 }}
            placeholder={
              effective.resultLimit === null
                ? t('search.resultLimit.unlimited')
                : String(effective.resultLimit)
            }
          />
        ),
        desc: t('search.resultLimit.desc', {
          max: options.maxResultLimit,
          min: options.minResultLimit,
        }),
        label: (
          <SettingsSearchAnchor id={'search-result-limit'}>
            {t('search.resultLimit.label')}
          </SettingsSearchAnchor>
        ),
        name: 'resultLimit',
      },
      {
        children: <Select options={triStateOptions} />,
        desc: t('search.safeSearch.desc'),
        label: (
          <SettingsSearchAnchor id={'search-safe-search'}>
            {t('search.safeSearch.label')}
          </SettingsSearchAnchor>
        ),
        name: 'safeSearch',
      },
    ],
    title: t('search.group.results'),
  };

  // The endpoint and its bearer token are Worker secrets and never editable
  // here — the pane is told only whether the operator configured each one.
  const configuredRows = [
    ['endpoint', effective.configured.endpoint],
    ['apiKey', effective.configured.apiKey],
  ] as const;

  const operator: FormGroupItemType = {
    children: configuredRows.map(([key, isConfigured]) => ({
      children: (
        <Text type={isConfigured ? 'success' : 'secondary'}>
          {t(isConfigured ? 'search.configured.yes' : 'search.configured.no')}
        </Text>
      ),
      desc: t(`search.configured.${key}Desc` as any),
      label: t(`search.configured.${key}` as any),
      layout: 'horizontal' as const,
      minWidth: undefined,
    })),
    title: t('search.group.operator'),
  };

  const isDirty = isFormDirty(values, settings.overrides);

  return (
    <>
      <Form
        collapsible={false}
        form={form}
        initialValues={formValuesFromResponse(settings)}
        items={[sources, results, operator]}
        itemsType={'group'}
        variant={'filled'}
        {...FORM_STYLE}
      />
      <Flexbox horizontal gap={8} justify={'flex-end'} paddingBlock={16}>
        <Button
          disabled={isSaving || !hasAnyOverride(settings.overrides)}
          type={'default'}
          onClick={handleReset}
        >
          {t('search.actions.reset')}
        </Button>
        <Button disabled={!isDirty || isSaving} type={'default'} onClick={handleRevert}>
          {t('search.actions.revert')}
        </Button>
        <Button disabled={!isDirty} loading={isSaving} type={'primary'} onClick={handleSave}>
          {t('search.actions.save')}
        </Button>
      </Flexbox>
    </>
  );
};

export default SearchForm;
