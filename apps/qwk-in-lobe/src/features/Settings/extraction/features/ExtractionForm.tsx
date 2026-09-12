'use client';

import { type FormGroupItemType } from '@lobehub/ui';
import { Flexbox, Form, InputNumber } from '@lobehub/ui';
import { Button, Select, Skeleton, Text, toast } from '@lobehub/ui/base-ui';
import { Form as AntdForm } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { LanguageListSelect, OrderedMultiSelect } from '@/features/Settings/qwksearch';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';

import {
  ExtractionSettingsApiError,
  type ExtractionSettingsResponse,
  fetchExtractionSettings,
  resetExtractionSettings,
  saveExtractionSettings,
} from '../api';
import {
  EMPTY_FORM_VALUES,
  type ExtractionFormValues,
  formValuesFromResponse,
  hasAnyOverride,
  INHERIT,
  isFormDirty,
  overridesFromFormValues,
} from '../formState';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? '');

/**
 * The pane needs a signed-in user, so a 401 is the expected first response for
 * a signed-out visitor rather than a failure worth showing raw. Recognised here
 * because `ExtractionSettingsApiError` already carries the status.
 */
const isUnauthorized = (error: unknown) =>
  error instanceof ExtractionSettingsApiError && error.status === 401;

const ExtractionForm = () => {
  const { t } = useTranslation('qwksearch');
  const [form] = AntdForm.useForm<ExtractionFormValues>();

  const [settings, setSettings] = useState<ExtractionSettingsResponse>();
  const [loadError, setLoadError] = useState<string>();
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const values = AntdForm.useWatch([], form);

  // Render the response rather than the form's optimistic state: `PUT` echoes
  // what survived validation, so a sixth language or an unknown tier comes back
  // trimmed and the inputs must follow it.
  const apply = useCallback(
    (response: ExtractionSettingsResponse) => {
      setSettings(response);
      form.setFieldsValue(formValuesFromResponse(response));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;

    fetchExtractionSettings()
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
      apply(await saveExtractionSettings(overridesFromFormValues(form.getFieldsValue())));
      toast.success(t('extraction.saved'));
    } catch (error) {
      toast.error(
        isUnauthorized(error)
          ? t('extraction.error.loginRequired')
          : t('extraction.saveFailed', { error: errorMessage(error) }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [apply, form, t]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    try {
      apply(await resetExtractionSettings());
      toast.success(t('extraction.reset'));
    } catch (error) {
      toast.error(
        isUnauthorized(error)
          ? t('extraction.error.loginRequired')
          : t('extraction.saveFailed', { error: errorMessage(error) }),
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
          {needsLogin ? t('extraction.error.loginRequired') : t('extraction.error.load')}
        </Text>
        {!needsLogin && loadError && <Text type={'secondary'}>{loadError}</Text>}
      </Flexbox>
    );
  }

  const { effective, options } = settings;

  /** "Currently: X" — what the field resolves to once the operator's env applies. */
  const inForce = (value: string) => t('extraction.inForce', { value });

  const inheritOption = { label: t('extraction.inherit'), value: INHERIT };

  const preferences: FormGroupItemType = {
    children: [
      {
        children: (
          <Select
            options={[
              inheritOption,
              ...options.citationStyles.map((style) => ({
                label: t(`extraction.citationStyle.${style}` as any, style.toUpperCase()),
                value: style,
              })),
            ]}
          />
        ),
        desc: inForce(effective.citationStyle.toUpperCase()),
        label: (
          <SettingsSearchAnchor id={'extraction-citation-style'}>
            {t('extraction.citationStyle.label')}
          </SettingsSearchAnchor>
        ),
        name: 'citationStyle',
      },
      {
        children: <LanguageListSelect placeholder={t('extraction.languages.placeholder')} />,
        desc: t('extraction.languages.desc', { value: effective.languages.join(', ') }),
        label: (
          <SettingsSearchAnchor id={'extraction-languages'}>
            {t('extraction.languages.label')}
          </SettingsSearchAnchor>
        ),
        name: 'languages',
      },
      {
        children: (
          <Select
            options={[
              inheritOption,
              { label: t('extraction.thirdPartyBackup.on'), value: 'on' },
              { label: t('extraction.thirdPartyBackup.off'), value: 'off' },
            ]}
          />
        ),
        desc: t('extraction.thirdPartyBackup.desc'),
        label: (
          <SettingsSearchAnchor id={'extraction-third-party-backup'}>
            {t('extraction.thirdPartyBackup.label')}
          </SettingsSearchAnchor>
        ),
        name: 'useThirdPartyBackup',
      },
    ],
    title: t('extraction.group.preferences'),
  };

  const chain: FormGroupItemType = {
    children: [
      {
        children: (
          <OrderedMultiSelect
            placeholder={t('extraction.tiers.placeholder')}
            options={options.tiers.map((tier) => ({
              label: t(`extraction.tier.${tier}` as any, tier),
              value: tier,
            }))}
          />
        ),
        desc: t('extraction.tiers.desc', { value: effective.tiers.join(' → ') }),
        label: (
          <SettingsSearchAnchor id={'extraction-tiers'}>
            {t('extraction.tiers.label')}
          </SettingsSearchAnchor>
        ),
        name: 'tiers',
      },
      {
        children: (
          <InputNumber
            max={options.maxTimeoutSeconds}
            min={options.minTimeoutSeconds}
            placeholder={String(effective.timeoutSeconds)}
            style={{ width: 140 }}
          />
        ),
        desc: t('extraction.timeout.desc', {
          max: options.maxTimeoutSeconds,
          min: options.minTimeoutSeconds,
          value: effective.timeoutSeconds,
        }),
        label: (
          <SettingsSearchAnchor id={'extraction-timeout'}>
            {t('extraction.timeout.label')}
          </SettingsSearchAnchor>
        ),
        name: 'timeoutSeconds',
      },
      {
        children: (
          <Select
            options={[
              inheritOption,
              ...options.pdfProcessors.map((processor) => ({
                label: t(`extraction.pdfProcessor.${processor}` as any, processor),
                value: processor,
              })),
            ]}
          />
        ),
        desc: inForce(effective.pdfProcessor),
        label: (
          <SettingsSearchAnchor id={'extraction-pdf-processor'}>
            {t('extraction.pdfProcessor.label')}
          </SettingsSearchAnchor>
        ),
        name: 'pdfProcessor',
      },
    ],
    title: t('extraction.group.chain'),
  };

  // Hosts and credentials are Worker secrets and never editable here — the pane
  // is told only whether the operator configured each one.
  const configuredRows = [
    ['scraperUrl', effective.configured.scraperUrl],
    ['scraperApiKey', effective.configured.scraperApiKey],
    ['tavilyApiKey', effective.configured.tavilyApiKey],
    ['pdfProcessorUrl', effective.configured.pdfProcessorUrl],
    ['proxy', effective.configured.proxy],
  ] as const;

  const operator: FormGroupItemType = {
    children: configuredRows.map(([key, isConfigured]) => ({
      children: (
        <Text type={isConfigured ? 'success' : 'secondary'}>
          {t(isConfigured ? 'extraction.configured.yes' : 'extraction.configured.no')}
        </Text>
      ),
      desc: t(`extraction.configured.${key}Desc` as any),
      label: t(`extraction.configured.${key}` as any),
      layout: 'horizontal' as const,
      minWidth: undefined,
    })),
    title: t('extraction.group.operator'),
  };

  const isDirty = isFormDirty(values, settings.overrides);

  return (
    <>
      <Form
        collapsible={false}
        form={form}
        initialValues={formValuesFromResponse(settings)}
        items={[preferences, chain, operator]}
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
          {t('extraction.actions.reset')}
        </Button>
        <Button disabled={!isDirty || isSaving} type={'default'} onClick={handleRevert}>
          {t('extraction.actions.revert')}
        </Button>
        <Button disabled={!isDirty} loading={isSaving} type={'primary'} onClick={handleSave}>
          {t('extraction.actions.save')}
        </Button>
      </Flexbox>
    </>
  );
};

export default ExtractionForm;
