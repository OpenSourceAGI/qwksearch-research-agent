import test from 'node:test';
import assert from 'node:assert/strict';
import {isEmbedded,defaultAction} from '../extension/lib/host.js';

const browser=manifest=>({runtime:{getManifest:()=>manifest}});
test('the standalone manifest has no side panel, so LeoTabs owns the toolbar and install page',()=>{
  assert.equal(isEmbedded(browser({action:{}})),false);
  assert.equal(isEmbedded({}),false);
});
test('a host manifest with a side panel embeds LeoTabs',()=>{
  assert.equal(isEmbedded(browser({side_panel:{default_path:'sidepanel.html'}})),true);
});
test('the default toolbar action comes from the running manifest',()=>{
  assert.deepEqual(defaultAction(browser({action:{default_title:'QwkSearch',default_icon:{16:'icon/16.png'}}})),{path:{16:'icon/16.png'},title:'QwkSearch'});
  assert.equal(defaultAction({}).title,'Open LeoTabs library');
  assert.equal(defaultAction({}).path[16],'icons/16.png');
});
