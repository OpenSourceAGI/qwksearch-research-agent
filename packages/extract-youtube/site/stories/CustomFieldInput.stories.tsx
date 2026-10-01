import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomFieldInput, GridStylesProvider } from 'extract-youtube/react';
import type { CustomFieldDef } from 'extract-youtube/library';
import { useState } from 'react';

import { DEMO_FIELDS } from './fixtures';

/**
 * One input for one custom field, picked by the field's `type`. This is what
 * `<VideoEditDialog>` renders for each field under "Custom fields". Use it
 * directly to put custom fields in a form of your own.
 *
 * | `type` | Input | Stored as |
 * | --- | --- | --- |
 * | `text` | one-line text box | string |
 * | `textarea` | multi-line text box | string |
 * | `number` | number box | number |
 * | `boolean` | checkbox | `true` / `false` |
 * | `url` | URL box; only `http(s)://` is kept | string |
 * | `select` | dropdown of `options` | one of `options` |
 *
 * The server coerces every value the same way (`coerceCustomValue`), so a
 * value that does not fit its type is dropped, never stored as garbage.
 */
const meta = {
  title: 'Admin/CustomFieldInput',
  component: CustomFieldInput,
  decorators: [
    (Story) => (
      <GridStylesProvider>
        <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
          <Story />
        </div>
      </GridStylesProvider>
    ),
  ],
} satisfies Meta<typeof CustomFieldInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function Field({ def, initial }: { def: CustomFieldDef; initial?: string | boolean }) {
  const [value, setValue] = useState<string | boolean | undefined>(initial);
  return <CustomFieldInput def={def} value={value} onChange={setValue} />;
}

const field = (key: string) => DEMO_FIELDS.find((def) => def.key === key)!;

export const Text: Story = { args: { def: field('speaker'), value: 'Grant Sanderson', onChange: () => undefined }, render: (args) => <Field def={args.def} initial="Grant Sanderson" /> };
export const Select: Story = { args: { def: field('level'), value: 'Beginner', onChange: () => undefined }, render: (args) => <Field def={args.def} initial="Beginner" /> };
export const Url: Story = { args: { def: field('slides'), value: '', onChange: () => undefined }, render: (args) => <Field def={args.def} /> };
export const NumberField: Story = { name: 'Number', args: { def: field('minutes'), value: '19', onChange: () => undefined }, render: (args) => <Field def={args.def} initial="19" /> };
export const Boolean: Story = { args: { def: field('captioned'), value: true, onChange: () => undefined }, render: (args) => <Field def={args.def} initial /> };
export const Textarea: Story = {
  args: { def: { key: 'notes', label: 'Notes', type: 'textarea', help: 'Anything editors should know.' }, value: '', onChange: () => undefined },
  render: (args) => <Field def={args.def} />,
};

/** Every demo field together, the way the edit dialog lays them out. */
export const AllDemoFields: Story = {
  args: { def: field('speaker'), value: '', onChange: () => undefined },
  render: () => (
    <>
      {DEMO_FIELDS.map((def) => (
        <Field key={def.key} def={def} />
      ))}
    </>
  ),
};
