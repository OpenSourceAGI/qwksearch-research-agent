import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingRule,DEFAULT_RULES,arrangeSaved} from '../extension/lib/arrange.js';
import {duplicateCandidates,newCollection,validateCollections,migrate,initialState,snapshotTabs} from '../extension/lib/model.js';
import {manageableURL} from '../extension/lib/tab-policy.js';
import {colorHex,colorInk,validColor} from '../extension/lib/colors.js';
import {sanitizeSettings} from '../extension/lib/settings.js';
test('default GitHub rule handles paths and queries without matching lookalike domains',()=>{
  assert.equal(matchingRule('https://github.com/a/b?q=1',DEFAULT_RULES).group,'GitHub');
  assert.equal(matchingRule('https://github.com',DEFAULT_RULES).group,'GitHub');
  assert.equal(matchingRule('https://github.com.evil.test/a',DEFAULT_RULES),undefined);
  assert.equal(matchingRule('https://other.test/github.com/a',DEFAULT_RULES),undefined);
});
test('automatic rules preserve manual groups and reuse existing destinations',()=>{
  const c=newCollection();c.groups=[{id:'manual',name:'My project'},{id:'github',name:'GitHub'}];
  c.links=[{id:'1',url:'https://github.com/a',groupId:'manual'},{id:'2',url:'https://github.com/b',groupId:null}];
  arrangeSaved(c,DEFAULT_RULES);arrangeSaved(c,DEFAULT_RULES);
  assert.equal(c.links[0].groupId,'manual');assert.equal(c.links[1].groupId,'github');assert.equal(c.groups.length,2);
});
test('new tab and settings duplicates are manageable without entering saved snapshots',()=>{
  const urls=['chrome://newtab/','chrome://newtab/','chrome://settings/','chrome://settings/','https://site.test'];
  const tabs=urls.map((url,id)=>({id,url,groupId:-1,windowId:1,index:id}));
  assert.equal(duplicateCandidates(tabs).length,2);
  assert(manageableURL('edge://extensions/'));
  assert.equal(snapshotTabs(tabs).links.length,1);
});
test('custom colours roundtrip and contrasting foreground covers light and dark colours',()=>{
  const c=newCollection('Custom','#123456');
  assert.equal(validateCollections([c])[0].color,'#123456');
  assert.equal(colorHex(c.color),'#123456');assert.equal(colorInk('#ffffff'),'#17221e');assert.equal(colorInk('#000000'),'#ffffff');
  assert(!validColor('url(https://tracking.test)'));
});
test('AI stays opt-in, preferences persist, and old custom rules fall back to defaults',()=>{
  const old=initialState();delete old.settings.autoGroup;old.settings.rules=[];
  assert.equal(migrate(old).settings.rules[0].group,'GitHub');
  const modern=initialState();modern.settings.rules=[{domain:"example.org",group:"Custom"}];modern.settings.websiteGrouping=false;
  assert.deepEqual(migrate(modern).settings.rules,initialState().settings.rules);
  assert.equal(migrate(modern).settings.websiteGrouping,true);
  assert.equal(initialState().settings.aiNaming,undefined);
  assert.equal(sanitizeSettings({aiNaming:true,autoGroup:false}).aiNaming,undefined);
  assert.equal(newCollection().autoUpdate,false);
});

test('auto-update default is configurable and portable without rewriting existing collection flags',()=>{
  const state=initialState();
  assert.equal(state.settings.autoUpdateDefault,false);
  const changed=sanitizeSettings({autoUpdateDefault:true});
  assert.equal(changed.autoUpdateDefault,true);
  state.collections=[{...newCollection(),autoUpdate:false}];
  state.settings=changed;
  assert.equal(migrate(state).collections[0].autoUpdate,false);
});
