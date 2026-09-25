
import {policyFor,findRule,rankItems,templateName,isGenericName} from './organisation.js';
import {website,variedColour} from './website-groups.js';
import {nativeColor} from './colors.js';

// Runs only on the background operation queue. Browser observations are session
// scoped; explicit corrections use URL + collection scope and survive restarts.
export function nativeOrganisation({browser,db,ops,sessions}) {
  const scopeFor=(active,windowId)=>active[windowId]?.collectionId||'unassigned';
  const signature=(tab,groups)=>({url:tab.resourceUrl||tab.url,group:groups.find(g=>g.id===tab.groupId)?.title??null,groupId:tab.groupId,index:tab.index});
  // Tab identity survives navigation and moves between windows. A manual
  // ungroup stays in effect for this tab, without excluding other copies of its URL.
  const observedTabs=observations=>Object.assign({},...Object.values(observations).map(w=>w.tabs));
  const keepUngrouped=(tab,old)=>tab.groupId<0&&!!(old?.ungroupedByUser||old?.groupId>=0);
  async function observe(windowId,tabs,groups,scope) {
    const observations=(await browser.storage.session.get('neoOrganisationObserved')).neoOrganisationObserved||{};
    const previous=observations[windowId];
    const corrections=(await browser.storage.local.get('neoOrganisationCorrections')).neoOrganisationCorrections||[];
    let changed=false;
    if(previous?.scope===scope)for(const tab of tabs) {
      const old=previous.tabs[tab.id],next=signature(tab,groups);
      if(!old||old.url!==next.url)continue;
      if(old.group!==next.group) {
        const index=corrections.findIndex(c=>c.scope===scope&&c.url===next.url);
        const value={...(corrections[index]||{}),scope,url:next.url,group:next.group,manualGroup:true,manualName:old.groupId===next.groupId&&next.groupId>=0,at:Date.now()};
        if(index<0)corrections.push(value);else corrections[index]=value;
        changed=true;
      }
    }
    // Detect changed relative order, not index shifts caused by new/closed tabs.
    if(previous?.scope===scope) {
      const common=tabs.filter(t=>previous.tabs[t.id]?.url===(t.resourceUrl||t.url));
      const old=common.toSorted((a,b)=>previous.tabs[a.id].index-previous.tabs[b.id].index).map(t=>t.id);
      if(old.join()!==common.map(t=>t.id).join()) {
        const index=corrections.findIndex(c=>c.scope===scope&&c.orderLocked);
        if(index<0){corrections.push({scope,orderLocked:true,at:Date.now()});changed=true;}
      }
    }
    if(changed)await browser.storage.local.set({neoOrganisationCorrections:corrections.slice(-2000)});
    return corrections.filter(c=>c.scope===scope);
  }
  async function remember(windowId,scope,ungroupedIds=[]) {
    const tabs=(await ops.live()).filter(t=>t.windowId===windowId&&!t.pinned).sort((a,b)=>a.index-b.index);
    const groups=await browser.tabGroups.query({windowId});
    const observed=(await browser.storage.session.get('neoOrganisationObserved')).neoOrganisationObserved||{};
    const previous=observedTabs(observed);
    const keep=new Set(ungroupedIds);
    observed[windowId]={scope,tabs:Object.fromEntries(tabs.map(t=>[t.id,{...signature(t,groups),ungroupedByUser:keepUngrouped(t,previous[t.id])||(t.groupId<0&&keep.has(t.id))}]))};
    const ids=new Set((await browser.windows.getAll({windowTypes:['normal']})).map(w=>String(w.id)));
    for(const id of Object.keys(observed))if(!ids.has(id))delete observed[id];
    await browser.storage.session.set({neoOrganisationObserved:observed});
  }
  async function run(windowId,{force=false,rulesOnly=false}={}) {
    const state=await db.getState(),active=(await sessions.list()).active;
    const c=state.collections.find(c=>c.id===active[windowId]?.collectionId);
    const scope=scopeFor(active,windowId),policy=policyFor(state,c);
    if(rulesOnly)policy.group='rules';
    let tabs=(await ops.live()).filter(t=>t.windowId===windowId&&!t.pinned).sort((a,b)=>a.index-b.index);
    let groups=await browser.tabGroups.query({windowId});
    const corrections=await observe(windowId,tabs,groups,scope);
    if(!force&&!policy.automatic&&state.settings.autoGroup===false){await remember(windowId,scope);return {policy,corrections,scope};}
    if(state.settings.autoGroup!==false) {
      const buckets=new Map();
      const stored=(await browser.storage.session.get('neoGroupKeys')).neoGroupKeys||{},owned=stored[windowId]||{};
      const previous=observedTabs((await browser.storage.session.get('neoOrganisationObserved')).neoOrganisationObserved||{});
      for(const tab of tabs) {
        if(tab.groupId>=0||keepUngrouped(tab,previous[tab.id]))continue;
        const match=findRule(tab,state.settings.rules);
        const site=state.settings.websiteGrouping!==false?website(tab.resourceUrl||tab.url):null;
        const rule=match||(site?{group:site.name,color:'random',siteKey:site.key}:null);if(!rule||rule.exclude)continue;
        const name=templateName(rule.group,[tab],{space:state.spaces.find(s=>s.id===c?.spaceId)?.name||''});
        const targetKey=rule.siteKey||'rule:'+name;
        if(!buckets.has(targetKey))buckets.set(targetKey,{name,rule,key:targetKey,tabs:[]});buckets.get(targetKey).tabs.push(tab);
      }
      for(const bucket of buckets.values()) {
        const name=bucket.name;
        const valid=[];
        for(const t of bucket.tabs) {const now=await browser.tabs.get(t.id).catch(()=>null);if(now&&now.windowId===windowId&&!now.pinned&&now.groupId===t.groupId&&now.url===t.url)valid.push(t.id);}
        if(!valid.length)continue;
        const existing=groups.find(g=>g.title===name&&(!bucket.rule.siteKey||tabs.filter(t=>t.groupId===g.id).every(t=>website(t.resourceUrl||t.url)?.key===bucket.rule.siteKey)));
        // A lone newly eligible tab does not need a new browser group.
        if(!existing&&valid.length<2)continue;
        const id=await browser.tabs.group({tabIds:valid,...(existing?{groupId:existing.id}:{createProperties:{windowId}})});
        if(!existing){const color=bucket.rule.color&&bucket.rule.color!=='random'?nativeColor(bucket.rule.color):variedColour(groups.map(g=>g.color));await browser.tabGroups.update(id,{title:name,color});groups.push({id,title:name,color});}
        owned[id]=bucket.key;
      }
      stored[windowId]=Object.fromEntries(Object.entries(owned).filter(([id])=>groups.some(g=>g.id===Number(id))));
      await browser.storage.session.set({neoGroupKeys:stored});
    }
    if(!force&&!policy.automatic){await remember(windowId,scope);return {policy,corrections,scope};}
    tabs=(await ops.live()).filter(t=>t.windowId===windowId&&!t.pinned).sort((a,b)=>a.index-b.index);
    groups=await browser.tabGroups.query({windowId});
    if(policy.groupName==='template')for(const group of groups) {
      const members=tabs.filter(t=>t.groupId===group.id);
      if(members.length&&isGenericName(group.title)&&!corrections.some(x=>members.some(t=>(t.resourceUrl||t.url)===x.url)&&x.manualName))
        await browser.tabGroups.update(group.id,{title:templateName(policy.groupTemplate,members,{name:group.title})});
    }
    if(c&&policy.collectionName==='template'&&!c.manualName&&isGenericName(c.name)) {
      const name=templateName(policy.collectionTemplate,tabs,{name:c.name,space:state.spaces.find(s=>s.id===c.spaceId)?.name||''});
      if(name!==c.name)await db.mutate('Automatic collection name',s=>{const target=s.collections.find(x=>x.id===c.id);if(!target||target.name!==c.name||target.manualName)return {unchanged:true};target.name=name;});
    }
    if(!corrections.some(c=>c.orderLocked))await orderNative(browser,tabs,groups,policy,state.settings.rules);
    await remember(windowId,scope);
    return {policy,corrections,scope};
  }
  return {run,remember};
}

export async function orderNative(browser,tabs,groups,policy,rules,ai={}) {
  if(!tabs.length||(policy.tabOrder==='manual'&&policy.groupOrder==='manual'))return;
  const rank=(items,mode,options,ids)=>mode==='ai'&&ids
    ? [...items].sort((a,b)=>(ids.indexOf(options.id(a))<0?Infinity:ids.indexOf(options.id(a)))-(ids.indexOf(options.id(b))<0?Infinity:ids.indexOf(options.id(b))))
    :rankItems(items,mode,rules,options);
  const blocks=[];
  for(const tab of tabs) {
    if(tab.groupId>=0) {
      let block=blocks.find(b=>b.groupId===tab.groupId);
      if(!block){block={groupId:tab.groupId,name:groups.find(g=>g.id===tab.groupId)?.title||'',links:[]};blocks.push(block);}
      block.links.push(tab);
    } else blocks.push({groupId:-1,name:tab.title,links:[tab]});
  }
  const grouped=rank(blocks.filter(b=>b.groupId>=0),policy.groupOrder,{links:b=>b.links,id:b=>b.groupId},ai.groupIds);
  const singles=rank(blocks.filter(b=>b.groupId<0),policy.tabOrder,{links:b=>b.links,name:b=>b.name,id:b=>b.links[0].id},ai.tabIds);
  // Preserve the positions of group/single blocks relative to one another.
  const desired=blocks.map(b=>b.groupId>=0?grouped.shift():singles.shift());
  let index=Math.min(...tabs.map(t=>t.index));
  for(const block of desired) {
    const members=rank(block.links,policy.tabOrder,{id:t=>t.id},ai.tabIds);
    if(block.groupId>=0) {
      const current=await browser.tabs.query({groupId:block.groupId});
      if(Math.min(...current.map(t=>t.index))!==index)await browser.tabGroups.move(block.groupId,{index});
    }
    for(const tab of members) {
      const current=await browser.tabs.get(tab.id);
      if(current.windowId!==tab.windowId||current.pinned||current.url!==tab.url)throw Error('Tabs changed while arranging.');
      if(current.index!==index)await browser.tabs.move(tab.id,{index});
      index++;
    }
  }
}
