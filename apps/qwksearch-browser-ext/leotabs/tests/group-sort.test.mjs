
import test from 'node:test';
import assert from 'node:assert/strict';
import {website,variedColour,RULE_PRESETS} from '../extension/lib/website-groups.js';
import {groupingTarget,tabArrangement} from '../extension/lib/tab-arrangement.js';
import {sanitizeSettings} from '../extension/lib/settings.js';
test('zero-config website grouping names services and handles public suffixes without merging service identities',()=>{
 assert.equal(website('https://www.github.com/a').name,'GitHub');
 assert.equal(website('https://example.co.uk').name,'Example');
 assert.equal(website('https://alice.github.io').name,'Alice');
 assert.equal(website('https://gemini.google.com').name,'Gemini');
 assert.notEqual(website('https://mail.google.com').key,website('https://gemini.google.com').key);
 assert.notEqual(website('https://example.com').key,website('https://example.org').key);
 assert.equal(website('chrome://newtab'),null);
 assert.equal(website('https://webstore.google.com/detail/x').name,'Chrome Web Store');
});
test('rules take priority over website defaults, exclude tabs, and split GitHub projects deterministically',()=>{
 const preset=RULE_PRESETS.find(p=>p.id==='github-projects').rules;
 const a=groupingTarget({url:'https://github.com/acme/one/issues'},preset);
 const b=groupingTarget({url:'https://github.com/acme/two/pulls'},preset);
 assert.equal(a.name,'GitHub · acme/one');assert.notEqual(a.key,b.key);
 assert.equal(groupingTarget({url:'https://github.com'},[{domain:'github.com',exclude:true}]),null);
 assert.equal(groupingTarget({url:'https://unknown.example'},[],false),null);
});
test('new native groups use all available colours before repeating, and old Web Store setting is discarded',()=>{
 const used=[];for(let i=0;i<9;i++)used.push(variedColour(used));assert.equal(new Set(used).size,9);
 const settings=sanitizeSettings({captureWebStore:false});assert(!Object.hasOwn(settings,'captureWebStore'));assert.equal(settings.websiteGrouping,true);
});

test('AI stale-layout guard sees navigation before the new URL commits',()=>{
 const {signature}=tabArrangement({});const tab={id:1,url:'https://example.com',groupId:2,index:0,pinned:false};
 assert.notEqual(signature([tab]),signature([{...tab,pendingUrl:'https://example.com/new'}]));
});
