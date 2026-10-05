import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_POLICY,policyFor,sanitizeRules,findRule,templateName,applySavedPolicy,rankItems} from '../extension/lib/organisation.js';
import {initialState,validateCollections,validateSpaces,migrate} from '../extension/lib/model.js';
import {portableSettings,sanitizeSettings} from '../extension/lib/settings.js';

test('removed organisation policies cannot override built-in grouping or enable background AI',()=>{
  const s=initialState();s.settings.organisation={group:'rules-ai',collectionName:'template'};
  s.settings.aiNaming=true;
  s.spaces[0].organisation={tabOrder:'title',group:'keep'};
  const c={spaceId:'main',organisation:{group:'ai'}};
  assert.deepEqual(policyFor(s,c),DEFAULT_POLICY);
  s.settings.autoGroup=false;
  assert.equal(policyFor(s,c).group,'keep');
});
test('migration and preferences discard legacy policies without changing saved work',()=>{
  const s=initialState();s.settings.organisation={collectionName:'ai'};s.settings.aiNaming=true;
  s.spaces[0].organisation={collectionOrder:'ai'};
  s.collections=[{id:'c',spaceId:'main',name:'My title',note:'My note',manualOrder:true,links:[],groups:[],organisation:{group:'ai'}}];
  const clean=migrate(s);
  assert.equal(clean.settings.organisation,undefined);
  assert.equal(clean.settings.aiNaming,undefined);
  assert.equal(clean.spaces[0].organisation,undefined);
  assert.deepEqual(clean.collections[0],{id:'c',spaceId:'main',name:'My title',note:'My note',manualOrder:true,links:[],groups:[]});
  for(const settings of [sanitizeSettings(s.settings,s.settings),portableSettings(s.settings)]) {
    assert.equal(settings.organisation,undefined);
    assert.equal(settings.aiNaming,undefined);
  }
});
test('priority, title conditions and exclusion rules work internally but settings keep built-in defaults',()=>{
  const rules=sanitizeRules([
    {domain:'github.com/*',group:'Code',color:'mint',priority:1},
    {domain:'github.com/private/*',title:'Confidential',exclude:true,priority:10},
    {title:'guide',group:'Guides',enabled:false,priority:100},
  ]);
  assert(findRule({url:'https://github.com/private/a',title:'Confidential guide'},rules).exclude);
  assert.equal(findRule({url:'https://github.com/private/a',title:'Public guide'},rules).group,'Code');
  assert.equal(findRule({url:'https://github.com.evil.test/x',title:'guide'},rules),null);
  assert.deepEqual(sanitizeSettings({rules,websiteGrouping:false}).rules,initialState().settings.rules);
  assert.equal(sanitizeSettings({rules,websiteGrouping:false}).websiteGrouping,true);
});
test('templates, rule colours and saved ordering respect manual decisions',()=>{
  const c={name:'New collection',links:[{id:'b',url:'https://docs.test/b',title:'Zebra'},{id:'a',url:'https://docs.test/a',title:'Apple'},{id:'m',url:'https://docs.test/m',title:'Manual',manualGroup:true}],groups:[]};
  const p={...DEFAULT_POLICY,collectionName:'template',collectionTemplate:'{domain} · {count}',tabOrder:'title'};
  applySavedPolicy(c,p,[{domain:'docs.test',group:'Docs',color:'mint'}]);
  assert.equal(c.name,'docs.test · 3');assert.equal(c.groups[0].color,'mint');
  assert.deepEqual(c.links.filter(l=>l.groupId).map(l=>l.title),['Apple','Zebra']);
  assert(!c.links.find(l=>l.id==='m').groupId);
  c.name='My name';c.manualName=true;c.manualOrder=true;
  const before=c.links.map(l=>l.id);applySavedPolicy(c,p,[]);
  assert.equal(c.name,'My name');assert.deepEqual(c.links.map(l=>l.id),before);
  assert.equal(templateName('{space}: {title}',[{title:'Article'}],{space:'Research'}),'Research: Article');
});
test('imports remove policies and preserve manual correction metadata',()=>{
  const c=validateCollections([{id:'c',name:'C',manualName:true,manualOrder:true,organisation:{group:'keep'},groups:[{id:'g',name:'G',manualName:true}],links:[{id:'l',url:'https://a.test',manualGroup:true,groupId:'g'}]}])[0];
  assert(c.manualName&&c.manualOrder&&c.groups[0].manualName&&c.links[0].manualGroup);
  assert.equal(c.organisation,undefined);
  assert.equal(validateSpaces([{id:'s',name:'S',organisation:{tabOrder:'title'}}])[0].organisation,undefined);
});
