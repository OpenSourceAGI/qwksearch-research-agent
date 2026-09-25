
import { el, button, icon, popover, task, menu } from './shared.js';
import { duplicateCandidates } from '../lib/model.js';

export function orderedTabs(tabs, order = 'recent') {
  if(order==='title')return [...tabs].sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  if(order==='domain')return [...tabs].sort((a,b)=>{const host=t=>{try{return new URL(t.resourceUrl||t.url).hostname;}catch{return '';}};return host(a).localeCompare(host(b))||a.index-b.index;});
  const sorted = [...tabs].sort(
    order === 'recent'
      ? (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
      : (a, b) => a.windowId - b.windowId || a.index - b.index,
  );
  return order === 'reverse' ? sorted.reverse() : sorted;
}

// Both tab surfaces use these exact controls, settings and save dialog.
export function createTabTools({ getTabs, getSettings, change, actions, compact = false, showCloseAll = true, showTopicAI = true, showAutoGroup = true }) {
  const openGrouping=()=>{
    const sort=more;
    const include=el('input',{type:'checkbox',checked:getSettings().regroupExisting!==false,'aria-label':'Include already grouped tabs'});
    const apply=button('Group & sort',task(async()=>{
      const started=performance.now();delete sort.dataset.durationMs;sort.disabled=true;sort.setAttribute('aria-busy','true');close();
      try {
        if(include.checked!==(getSettings().regroupExisting!==false))await change('settings',{settings:{regroupExisting:include.checked}});
        const result=await actions.groupSort({regroupExisting:include.checked});sort.dataset.operationId=result?.id||'';sort.dataset.timings=JSON.stringify({operationMs:result?.durationMs,...result?.timings});
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      }finally{sort.dataset.durationMs=String(Math.round(performance.now()-started));sort.disabled=false;sort.removeAttribute('aria-busy');}
    }),{className:'primary group-apply'});
    const {close}=popover('Group tabs',el('div',{},el('p',{class:'hint'},'Group by website. Sort A–Z, with ungrouped tabs first.'),el('label',{class:'check-label'},include,'Include already grouped tabs')),[apply],{anchor:sort});
  };
  const autoState=el('small',{class:'auto-group-state'});
  const auto=el('input',{type:'checkbox',role:'switch','aria-label':'Auto-group new tabs',onchange:task(async e=>{const enabled=e.target.checked;auto.disabled=true;try{await change('settings',{settings:{autoGroup:enabled}});}catch(error){auto.checked=!enabled;throw error;}finally{auto.disabled=false;autoState.textContent=auto.checked?'On':'Off';}})});
  const grouping=el('div',{class:'grouping-controls'},el('label',{class:'settings-preference auto-group-control'},el('span',{},'Auto-group new tabs'),auto,autoState));
  const more=button('Group and sort tabs',e=>menu('Tab actions',[
    ['Group & sort',openGrouping,'group'],
    ...(showTopicAI ? [['Group by topic with AI',()=>actions.aiTabs(),'sparkles'],null] : []),
    ...[['recent','Most recent first'],['title','Title A–Z'],['domain','Website']].map(([order,label])=>[label,()=>actions.sortTabs(order)]),
  ],{anchor:e.currentTarget,prefix:el('p',{class:'hint'},'Sort ungrouped tabs, then groups')}),{glyph:'sort',quiet:true,className:'tab-more-button'});
  const save = button('Save tabs', () => actions.save(), { glyph: 'tray', quiet: compact });
  const dedup = button(
    'Close duplicate tabs',
    task(async () => {
      const tabIds = duplicateCandidates(getTabs());
      if (tabIds.length) await change('close', { tabIds });
    }),
    { glyph: 'broom', quiet: compact, className: 'dedup-button' },
  );
  const node = el(
    'div',
    { class: 'tab-tools' + (compact ? ' compact' : ''), 'aria-label': 'Tab actions' },
    ...(showAutoGroup ? [grouping] : []),
    more,
    save,
    dedup,
    ...(showCloseAll ? [button('Close all currently open tabs', task(()=>actions.closeWindow()), {className:'close-all-tabs',title:'Close all unpinned tabs in this window. Pinned tabs stay open.'})] : []),
  );
  function update() {
    auto.checked=getSettings().autoGroup!==false;autoState.textContent=auto.checked?'On':'Off';
    const count = duplicateCandidates(getTabs()).length;
    dedup.replaceChildren(
      icon('broom'),
      ...(compact ? [] : ['Duplicates']),
      ...(count
        ? [el('span', { class: 'count-badge', 'aria-hidden': 'true' }, count > 99 ? '99+' : count)]
        : []),
    );
    dedup.title = count
      ? `Close ${count} duplicate tab${count === 1 ? '' : 's'}`
      : 'No duplicate tabs';
    dedup.setAttribute('aria-label', dedup.title);
    dedup.disabled = !count;
    save.disabled = !getTabs().some((t) => !t.pinned);
  }
  update();
  return { node, update, save, dedup, grouping };
}
