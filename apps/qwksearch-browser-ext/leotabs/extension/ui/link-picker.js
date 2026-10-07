
import { el, button } from './shared.js';

// Shared bounded list for selective resume and AI metadata selection.
export function linkPicker(
  links,
  { max = links.length, selected = links.length <= max, onChange = () => {} } = {},
) {
  const picks = new Set(selected ? links.map((l) => l.id) : []);
  let limit = 80;
  const query = el('input', {
      type: 'search',
      placeholder: 'Find a link…',
      'aria-label': 'Filter links',
    }),
    summary = el('span', { class: 'muted' }),
    list = el('div', { class: 'review-list' });
  const select = button(max < links.length ? `Select first ${max}` : 'Select all', () => {
    picks.clear();
    links.slice(0, max).forEach((l) => picks.add(l.id));
    render();
  });
  const node = el(
    'div',
    { class: 'link-picker' },
    el(
      'div',
      { class: 'row' },
      summary,
      select,
      button('Clear', () => {
        picks.clear();
        render();
      }),
    ),
    links.length > 12 ? query : null,
    list,
  );
  function render() {
    const filtered = links.filter((l) =>
      (l.title + ' ' + l.url).toLocaleLowerCase().includes(query.value.toLocaleLowerCase()),
    );
    summary.textContent = `${picks.size} of ${links.length} selected`;
    onChange(picks.size);
    list.replaceChildren(
      ...filtered.slice(0, limit).map((l) =>
        el(
          'label',
          {},
          el('input', {
            type: 'checkbox',
            checked: picks.has(l.id),
            disabled: !picks.has(l.id) && picks.size >= max,
            onchange: (event) => {
              if (event.target.checked && picks.size < max) picks.add(l.id);
              else picks.delete(l.id);
              summary.textContent = `${picks.size} of ${links.length} selected`;
              onChange(picks.size);
              for (const [index, input] of [...list.querySelectorAll('input')].entries())
                input.disabled = !picks.has(filtered[index].id) && picks.size >= max;
            },
          }),
          el('span', { class: 'row-title', title: l.url }, l.title),
        ),
      ),
    );
    if (filtered.length > limit)
      list.append(
        button('Show more links', () => {
          limit += 80;
          render();
        }),
      );
  }
  query.oninput = () => {
    limit = 80;
    render();
  };
  render();
  return { node, ids: () => [...picks] };
}
