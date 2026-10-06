
import { validColor, randomCollectionColor } from './colors.js';

export const DEFAULT_POLICY = {
  group:'rules', collectionName:'keep', groupName:'keep',
  tabOrder:'manual', groupOrder:'manual', collectionOrder:'manual', automatic:true,
  collectionTemplate:'{domain} · {date}', groupTemplate:'{domain}',
  orderInstruction:'Arrange in a useful reading sequence: overview, explanation, examples, reference.',
};
const short=(value,max=500)=>String(value??'').slice(0,max).trim();
// Legacy global, space and collection policies are deliberately ignored.
// Only the Auto-group switch controls the built-in automatic grouping.
export function policyFor(state) {
  return {...DEFAULT_POLICY,group:state.settings?.autoGroup===false?'keep':'rules'};
}
export function sanitizeRules(rules) {
  if(!Array.isArray(rules)||rules.length>50)throw Error('Use at most 50 rules.');
  for(const rule of rules)if(rule?.regex){const pattern=short(rule.domain,200);if(/\\[1-9]|\([^)]*[+*][^)]*\)[+*{]/.test(pattern))throw Error('Use a simple URL expression without nested repetition or backreferences.');try{new RegExp(pattern);}catch{throw Error('Invalid URL regular expression.');}}
  return rules.map((rule,index)=>({
    id:short(rule?.id,100)||crypto.randomUUID(),
    domain:short(rule?.domain,200).replace(/^https?:\/\//i,'').toLowerCase(),
    title:short(rule?.title,200),group:short(rule?.group,100),
    priority:Number.isFinite(Number(rule?.priority))?Math.max(-1000,Math.min(1000,Number(rule.priority))):0,
    enabled:rule?.enabled!==false,exclude:!!rule?.exclude,regex:!!rule?.regex,
    color:validColor(rule?.color)?rule.color:'random',
  })).filter(r=>(r.domain||r.title)&&(r.group||r.exclude));
}
function glob(value,pattern) {
  const escaped=pattern.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
  return new RegExp('^'+escaped+'$','i').test(value);
}
export function findRule(link,rules=[]) {
  let u;try{u=new URL(link.resourceUrl||link.url);}catch{return null;}
  if(!['http:','https:'].includes(u.protocol))return null;
  return [...rules].filter(r=>r.enabled!==false).sort((a,b)=>(b.priority||0)-(a.priority||0)).find(r=>{
    const pattern=(r.domain||'').replace(/^https?:\/\//i,'');
    let regexMatch=false;if(r.regex){try{regexMatch=new RegExp(pattern,'i').test(u.href.slice(0,4000));}catch{return false;}}
    const matchesURL=r.regex?regexMatch:!pattern || (pattern.includes('/') || pattern.includes('*')
      ? glob(u.hostname+ (pattern.includes('/')?u.pathname+u.search:''),pattern)
      : u.hostname===pattern || u.hostname.endsWith('.'+pattern));
    return matchesURL && (!r.title || glob(link.title||'',r.title.includes('*')?r.title:'*'+r.title+'*'));
  })||null;
}
export function templateName(template,links,{name='',space='',date=new Date()}={}) {
  const first=links[0]||{};
  const domains=links.map(l=>{try{return new URL(l.resourceUrl||l.url).hostname.replace(/^www\./,'');}catch{return '';}}).filter(Boolean);
  const counts=new Map();for(const d of domains)counts.set(d,(counts.get(d)||0)+1);
  const domain=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'Collection';
  let project=domain;try{project=new URL(first.resourceUrl||first.url).pathname.split('/').filter(Boolean).slice(0,2).join('/')||domain;}catch{}
  const values={domain,project,title:first.title||domain,count:links.length,date:date.toLocaleDateString('en-CA'),name,space};
  return short(String(template).replace(/\{(domain|project|title|count|date|name|space)\}/g,(_,key)=>values[key]),500)||name||domain;
}
export function isGenericName(name) {return /^(New collection|Untitled|Group|New group)?$/.test(name||'') || /^Saved .*\d/.test(name||'');}
export function rankItems(items,mode,rules=[],{name=x=>x.title||x.name||'',links=x=>[x]}={}) {
  if(['manual','ai'].includes(mode))return [...items];
  const domain=x=>{try{return new URL(links(x)[0]?.resourceUrl||links(x)[0]?.url).hostname;}catch{return '';}};
  const priority=x=>Math.max(-1001,...links(x).map(l=>findRule(l,rules)?.priority??-1001));
  return [...items].sort((a,b)=> {
    if(mode==='recent')return (b.lastAccessed||b.updatedAt||b.createdAt||0)-(a.lastAccessed||a.updatedAt||a.createdAt||0);
    if(mode==='rule')return priority(b)-priority(a);
    return (mode==='domain'?domain(a):name(a)).localeCompare(mode==='domain'?domain(b):name(b));
  });
}
export function applySavedPolicy(collection,policy,rules=[],{space=''}={}) {
  const c=collection;
  if(['rules','rules-ai'].includes(policy.group))for(const link of c.links) {
    if(link.groupId||link.manualGroup)continue;
    const rule=findRule(link,rules);if(!rule||rule.exclude)continue;
    const name=templateName(rule.group,[link],{space});
    let g=c.groups.find(g=>g.name===name);
    if(!g&&c.links.filter(l=>{if(l.groupId||l.manualGroup)return false;const r=findRule(l,rules);return r&&!r.exclude&&templateName(r.group,[l],{space})===name;}).length<2)continue;
    if(!g){g={id:crypto.randomUUID(),name,color:rule.color&&rule.color!=='random'?rule.color:randomCollectionColor(c.groups.at(-1)?.color),collapsed:false};c.groups.push(g);}
    link.groupId=g.id;
  }
  if(policy.collectionName==='template'&&!c.manualName&&isGenericName(c.name))
    c.name=templateName(policy.collectionTemplate,c.links,{name:c.name,space});
  for(const g of c.groups)if(policy.groupName==='template'&&!g.manualName&&isGenericName(g.name))
    g.name=templateName(policy.groupTemplate,c.links.filter(l=>l.groupId===g.id),{name:g.name,space});
  if(!c.manualOrder && (policy.tabOrder!=='manual'||policy.groupOrder!=='manual')) {
    c.groups=rankItems(c.groups,policy.groupOrder,rules,{links:g=>c.links.filter(l=>l.groupId===g.id)});
    // Keep groups contiguous; ordering within each group remains independent.
    c.links=[...rankItems(c.links.filter(l=>!l.groupId),policy.tabOrder,rules),
      ...c.groups.flatMap(g=>rankItems(c.links.filter(l=>l.groupId===g.id),policy.tabOrder,rules))];
  }
  return c;
}
