
import {findRule,templateName} from './organisation.js';
import {website,variedColour} from './website-groups.js';
import {nativeColor} from './colors.js';
const signature=tabs=>JSON.stringify(tabs.map(t=>[t.id,t.url,t.pendingUrl||null,t.resourceUrl||null,t.title,t.groupId,t.index,t.pinned]));
const layoutSignature=(tabs,groups)=>JSON.stringify(tabs.map(t=>{const group=groups.find(g=>g.id===t.groupId);return [t.id,t.url,t.index,t.pinned,group?[group.title,group.color,group.collapsed,tabs.filter(x=>x.groupId===group.id).map(x=>x.id).sort((a,b)=>a-b)]:null];}));
export function groupingTarget(tab,rules,websiteGrouping=true) {
  const rule=findRule(tab,rules);
  if(rule?.exclude)return null;
  if(rule)return {key:'rule:'+templateName(rule.group,[tab]),name:templateName(rule.group,[tab]),color:rule.color};
  return websiteGrouping?website(tab.resourceUrl||tab.url):null;
}
export function tabArrangement({browser,db,ops,sessions,nativeOrganiser}) {
  async function live(windowId){return (await ops.live()).filter(t=>t.windowId===windowId).sort((a,b)=>a.index-b.index);}
  async function arrange({windowId,tabIds,aiGroups,expected,regroupExisting=true,metadata}) {
    const start=performance.now(),timings={};const mark=key=>timings[key]=Math.round(performance.now()-start);
    const all=await live(windowId),state=await db.getState();
    if(expected&&signature(all)!==expected)throw Error('Tabs changed. Run AI organisation again.');
    const selected=new Set((tabIds||all.map(t=>t.id)).filter(id=>regroupExisting||all.some(t=>t.id===id&&t.groupId<0)));
    const tabs=all.filter(t=>selected.has(t.id)&&!t.pinned&&website(t.resourceUrl||t.url));
    if(!tabs.length&&!metadata)return {label:'No tabs to group'};
    const originalGroups=await browser.tabGroups.query({windowId});
    const before=all.map(t=>({id:t.id,url:t.url,groupId:t.groupId,index:t.index,pinned:t.pinned,active:t.active}));
    const scope=(await sessions.list()).active[windowId]?.collectionId||'unassigned';
    const stored=(await browser.storage.session.get('neoGroupKeys')).neoGroupKeys||{};
    const keys=stored[windowId]||{};
    const buckets=new Map();
    for(const tab of tabs) {
      const ai=aiGroups?.find(g=>g.tabIds.includes(tab.id));
      const target=ai?{key:'ai:'+ai.name,name:ai.name}:aiGroups?null:groupingTarget(tab,state.settings.rules,state.settings.websiteGrouping!==false);
      if(!target)continue;
      if(!buckets.has(target.key))buckets.set(target.key,{...target,tabs:[]});buckets.get(target.key).tabs.push(tab);
    }
    const singles=[];
    for(const [key,bucket] of buckets)if(bucket.tabs.length<2){singles.push(...bucket.tabs);buckets.delete(key);}
    if(aiGroups)for(const t of tabs)if(!singles.some(s=>s.id===t.id)&&![...buckets.values()].some(b=>b.tabs.some(x=>x.id===t.id)))singles.push(t);
    if(!buckets.size&&!singles.length&&!metadata)return {label:'No matching tabs'};
    const operation={id:crypto.randomUUID(),kind:'arrange',label:'Group and sort',at:Date.now(),status:'applying',windowId,tabs:before,sourceGroups:originalGroups,undoable:true,scope};
    if(metadata)operation.beforeCollection=structuredClone(state.collections.find(c=>c.id===metadata.collectionId));
    mark('read');await db.write('journal',operation);mark('prepared');
    const used=originalGroups.map(g=>g.color),claimed=new Set();
    try {
      if(singles.length)await browser.tabs.ungroup(singles.map(t=>t.id));
      const grouped=await Promise.allSettled([...buckets.values()].map(async bucket=>{
        // Only reuse a group whose members share the same semantic key. Titles alone are not identity.
        const existing=originalGroups.find(g=>!claimed.has(g.id)&&all.some(t=>t.groupId===g.id)&&all.filter(t=>t.groupId===g.id).every(t=>selected.has(t.id)&&bucket.tabs.some(b=>b.id===t.id)));
        const groupId=await browser.tabs.group({tabIds:bucket.tabs.map(t=>t.id),...(existing?{groupId:existing.id}:{createProperties:{windowId}})});
        claimed.add(groupId);keys[groupId]=bucket.key;
        const color=bucket.color&&bucket.color!=='random'?nativeColor(bucket.color):existing?.color||variedColour(used);used.push(color);
        await browser.tabGroups.update(groupId,{title:bucket.name,color});
        bucket.groupId=groupId;
      }));
      const failed=grouped.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      mark('grouped');
      // Keep unselected tabs in their original relative order; selected blocks move together.
      // With existing groups excluded from a whole-window sort, start before
      // those groups so standalone tabs do not remain stranded behind them.
      const wholeWindow=!tabIds||all.filter(t=>!t.pinned&&website(t.resourceUrl||t.url)).every(t=>tabIds.includes(t.id));
      let index=!regroupExisting&&wholeWindow ? all.find(t=>!t.pinned).index : Math.min(...tabs.map(t=>t.index));
      const blocks=[...buckets.values(),...singles.map(t=>({name:t.title||'',tabs:[t],groupId:-1}))];
      blocks.sort((a,b)=>(Number(a.groupId>=0)-Number(b.groupId>=0))||a.name.localeCompare(b.name));
      for(const bucket of blocks) {
        const members=[...bucket.tabs].sort((a,b)=>(a.title||'').localeCompare(b.title||'')||a.index-b.index);
        // Establish a group boundary first: moving member tabs into another block can ungroup them.
        if(bucket.groupId>=0)await browser.tabGroups.move(bucket.groupId,{index});
        await browser.tabs.move(members.map(t=>t.id),{index});
        index+=members.length;
      }
      mark('ordered');
      stored[windowId]=keys;await browser.storage.session.set({neoGroupKeys:stored});
      if(aiGroups){
        // An explicit topic arrangement is a placement choice, including tabs left ungrouped.
        // Do not let the next automatic website pass undo it or invalidate its Undo snapshot.
        const corrections=(await browser.storage.local.get('neoOrganisationCorrections')).neoOrganisationCorrections||[];
        const urls=new Set(tabs.map(t=>t.resourceUrl||t.url));
        const retained=corrections.filter(c=>c.scope!==scope||(!urls.has(c.url)&&!c.orderLocked));
        for(const url of urls)retained.push({scope,url,manualGroup:true,at:Date.now()});
        retained.push({scope,orderLocked:true,at:Date.now()});
        await browser.storage.local.set({neoOrganisationCorrections:retained.slice(-2000)});
      }
      await nativeOrganiser.remember(windowId,scope,singles.map(t=>t.id));
      if(state.settings.tabSort!=='position')await db.mutate('Show browser order',s=>{s.settings.tabSort='position';});
      mark('remembered');await sessions.capture(windowId,{reason:'Grouped and sorted tabs',force:true});mark('captured');
      if(metadata){await db.mutate('Organise collection',s=>{const c=s.collections.find(c=>c.id===metadata.collectionId);if(!c)throw Error('This collection is no longer available');c.name=metadata.name;c.note=metadata.note;c.updatedAt=Date.now();});operation.afterCollection=structuredClone((await db.getState()).collections.find(c=>c.id===metadata.collectionId));}
      operation.status='complete';operation.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));
      operation.label=`Grouped ${[...buckets.values()].reduce((n,b)=>n+b.tabs.length,0)} tabs into ${buckets.size} groups`;
      if(singles.length)operation.label=`Organised ${tabs.length} tabs · ${buckets.size} groups`;
      if(metadata)operation.label='Organised '+metadata.name;
      operation.durationMs=Math.round(performance.now()-start);operation.timings=timings;await db.write('journal',operation);
      return {id:operation.id,label:operation.label,undoable:true,durationMs:operation.durationMs,timings};
    } catch(error) {
      operation.status='partial';operation.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));await db.write('journal',operation);
      try {await undo(operation.id);} catch {}
      throw error;
    }
  }
  async function sort({windowId,order}) {
    if(!['title','domain','recent'].includes(order))throw Error('Unknown tab order.');
    const all=await live(windowId),tabs=all.filter(t=>!t.pinned);
    if(tabs.length<2)return {label:'No tabs to sort'};
    const sourceGroups=await browser.tabGroups.query({windowId});
    const host=t=>{try{return new URL(t.resourceUrl||t.url).hostname;}catch{return '';}};
    const compare=(a,b)=> (order==='recent' ? (b.lastAccessed||0)-(a.lastAccessed||0) : order==='domain' ? host(a).localeCompare(host(b)) : (a.title||'').localeCompare(b.title||'')) || a.index-b.index;
    const blocks=[];
    for(const tab of tabs){let block=tab.groupId>=0?blocks.find(b=>b.groupId===tab.groupId):null;if(!block){block={groupId:tab.groupId,tabs:[]};blocks.push(block);}block.tabs.push(tab);}
    for(const block of blocks)block.tabs.sort(compare);
    blocks.sort((a,b)=>{
      const grouped=Number(a.groupId>=0)-Number(b.groupId>=0);
      if(grouped)return grouped;
      if(order==='title'){
        const name=block=>sourceGroups.find(g=>g.id===block.groupId)?.title||block.tabs[0].title||'';
        return name(a).localeCompare(name(b))||a.tabs[0].index-b.tabs[0].index;
      }
      return compare(a.tabs[0],b.tabs[0]);
    });
    const scope=(await sessions.list()).active[windowId]?.collectionId||'unassigned';
    const op={id:crypto.randomUUID(),kind:'arrange',label:'Sorted tabs',at:Date.now(),status:'applying',windowId,tabs:all.map(t=>({id:t.id,url:t.url,groupId:t.groupId,index:t.index,pinned:t.pinned,active:t.active})),sourceGroups,undoable:true,scope};
    await db.write('journal',op);
    try {
      let index=Math.min(...tabs.map(t=>t.index));
      for(const block of blocks){
        if(block.groupId>=0)await browser.tabGroups.move(block.groupId,{index});
        await browser.tabs.move(block.tabs.map(t=>t.id),{index});index+=block.tabs.length;
      }
      const corrections=(await browser.storage.local.get('neoOrganisationCorrections')).neoOrganisationCorrections||[];
      await browser.storage.local.set({neoOrganisationCorrections:[...corrections.filter(c=>c.scope!==scope||!c.orderLocked),{scope,orderLocked:true,at:Date.now()}].slice(-2000)});
      await nativeOrganiser.remember(windowId,scope);
      if((await db.getState()).settings.tabSort!=='position')await db.mutate('Show browser order',s=>{s.settings.tabSort='position';});
      await sessions.capture(windowId,{reason:'Sorted tabs',force:true});
      op.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));op.status='complete';await db.write('journal',op);
      return {id:op.id,label:op.label,undoable:true};
    }catch(error){op.status='partial';op.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));await db.write('journal',op);try{await undo(op.id);}catch{}throw error;}
  }
  async function move({windowId,tabIds,groupId=-1,beforeTabId,afterTabId}) {
    const all=await live(windowId),selected=new Set(tabIds||[]);
    const tabs=all.filter(t=>selected.has(t.id)&&!t.pinned);
    if(!tabs.length||tabs.length!==selected.size)throw Error('Select unpinned tabs from this window');
    const sourceGroups=await browser.tabGroups.query({windowId});
    if(groupId>=0&&!sourceGroups.some(g=>g.id===groupId))throw Error('This group is no longer available');
    const validAnchor = (id, after) => {
      const target = all.find(t => t.id === id && !t.pinned);
      if (!target) return false;
      if (target.groupId === groupId) return true;
      // Ungrouped drops can sit outside a complete group, but cannot split
      // its members. Resolve and validate the boundary against current tabs.
      if (groupId >= 0) return false;
      const members = all.filter(t => t.groupId === target.groupId);
      return (after ? members.at(-1) : members[0])?.id === id;
    };
    if(beforeTabId!==undefined&&!validAnchor(beforeTabId,false))throw Error('The drop target changed. Drag again.');
    if(afterTabId!==undefined&&!validAnchor(afterTabId,true))throw Error('The drop target changed. Drag again.');
    if(selected.has(beforeTabId)||selected.has(afterTabId))return {unchanged:true};
    const scope=(await sessions.list()).active[windowId]?.collectionId||'unassigned';
    const op={id:crypto.randomUUID(),kind:'arrange',label:`Moved ${tabs.length} tab${tabs.length===1?'':'s'}`,at:Date.now(),status:'applying',windowId,tabs:all.map(t=>({id:t.id,url:t.url,groupId:t.groupId,index:t.index,pinned:t.pinned,active:t.active})),sourceGroups,undoable:true,scope};
    await db.write('journal',op);
    try {
      const ids=tabs.map(t=>t.id);
      if(groupId>=0)await browser.tabs.group({tabIds:ids,groupId});
      else await browser.tabs.ungroup(ids);
      if(beforeTabId!==undefined){const now=await live(windowId);const target=now.find(t=>t.id===beforeTabId);const index=target.index-now.filter(t=>selected.has(t.id)&&t.index<target.index).length;await browser.tabs.move(ids,{index});}
      else if(afterTabId!==undefined){const now=await live(windowId);const target=now.find(t=>t.id===afterTabId);const index=target.index+1-now.filter(t=>selected.has(t.id)&&t.index<=target.index).length;await browser.tabs.move(ids,{index});}
      else if(groupId<0)await browser.tabs.move(ids,{index:-1});
      if((await db.getState()).settings.tabSort!=='position')await db.mutate('Show browser order',s=>{s.settings.tabSort='position';});
      const corrections=(await browser.storage.local.get('neoOrganisationCorrections')).neoOrganisationCorrections||[];
      for(const t of tabs)corrections.push({scope,url:t.resourceUrl||t.url,manualGroup:true,at:Date.now()});
      corrections.push({scope,orderLocked:true,at:Date.now()});
      await browser.storage.local.set({neoOrganisationCorrections:corrections.slice(-2000)});
      await nativeOrganiser.remember(windowId,scope,groupId<0?ids:[]);
      await sessions.capture(windowId,{reason:'Moved tabs',force:true});
      op.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));op.status='complete';await db.write('journal',op);
      return {id:op.id,label:op.label,undoable:true};
    }catch(error){op.status='partial';op.after=layoutSignature(await live(windowId),await browser.tabGroups.query({windowId}));await db.write('journal',op);try{await undo(op.id);}catch{}throw error;}
  }
  async function undo(id) {
    const op=await db.read('journal',id);if(!op||op.kind!=='arrange'||op.status==='undone')throw Error('This arrangement is no longer available');
    const all=await live(op.windowId);
    if(op.afterCollection&&JSON.stringify((await db.getState()).collections.find(c=>c.id===op.afterCollection.id))!==JSON.stringify(op.afterCollection))throw Error('Can\'t undo organisation after editing the collection');
    // Structural edits after this operation must not be overwritten by an old Undo.
    if(layoutSignature(all,await browser.tabGroups.query({windowId:op.windowId}))!==op.after)throw Error('Can\'t undo after changing the tabs');
    const ids=op.tabs.filter(t=>!t.pinned).map(t=>t.id);
    if(ids.length)await browser.tabs.ungroup(ids);
    const restoredGroups=new Map();
    const existing=await browser.tabGroups.query({windowId:op.windowId});
    for(const group of op.sourceGroups) {
      const members=op.tabs.filter(t=>t.groupId===group.id&&!t.pinned);if(!members.length)continue;
      const groupId=await browser.tabs.group({tabIds:members.map(t=>t.id),...(existing.some(g=>g.id===group.id)?{groupId:group.id}:{createProperties:{windowId:op.windowId}})});
      restoredGroups.set(group.id,groupId);
      await browser.tabGroups.update(groupId,{title:group.title,color:group.color,collapsed:group.collapsed});
    }
    // Move contiguous original blocks in batches, including runs of ungrouped tabs.
    const blocks=[];for(const tab of op.tabs.filter(t=>!t.pinned)){const last=blocks.at(-1);if(last&&last.groupId===tab.groupId&&last.tabs.at(-1).index+1===tab.index)last.tabs.push(tab);else blocks.push({groupId:tab.groupId,tabs:[tab]});}
    for(const block of blocks){if(restoredGroups.has(block.groupId))await browser.tabGroups.move(restoredGroups.get(block.groupId),{index:block.tabs[0].index});await browser.tabs.move(block.tabs.map(t=>t.id),{index:block.tabs[0].index});}
    const active=op.tabs.find(t=>t.active);if(active)await browser.tabs.update(active.id,{active:true});
    const corrections=(await browser.storage.local.get('neoOrganisationCorrections')).neoOrganisationCorrections||[];
    for(const tab of all.filter(t=>!t.pinned))corrections.push({scope:op.scope,url:tab.resourceUrl||tab.url,manualGroup:true,at:Date.now()});
    corrections.push({scope:op.scope,orderLocked:true,at:Date.now()});
    await browser.storage.local.set({neoOrganisationCorrections:corrections.slice(-2000)});
    await nativeOrganiser.remember(op.windowId,op.scope);
    await sessions.capture(op.windowId,{reason:'Undo grouping',force:true});
    if(op.beforeCollection)await db.mutate('Undo collection organisation',s=>{const index=s.collections.findIndex(c=>c.id===op.beforeCollection.id);if(index>=0)s.collections[index]=structuredClone(op.beforeCollection);});
    op.status='undone';await db.write('journal',op);
    return {label:op.beforeCollection?'Collection organisation undone':op.label==='Sorted tabs'?'Tab sort undone':op.label.startsWith('Moved')?'Tab move undone':'Grouping undone'};
  }
  return {arrange,sort,move,undo,signature,live};
}
