
import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInstalled,UNINSTALL_URL} from '../extension/lib/lifecycle.js';

function fixture() {
  const pages=[],exits=[];
  const browser={
    runtime:{getURL:file=>'chrome-extension://test/'+file,setUninstallURL:async url=>{exits.push(url);}},
    tabs:{create:async options=>{pages.push(options);}},
  };
  return {browser,pages,exits};
}
test('first install opens one local guide and registers a fixed uninstall URL',async()=>{
  const {browser,pages,exits}=fixture();
  await handleInstalled(browser,{reason:'install'});
  assert.deepEqual(pages,[{url:'chrome-extension://test/app.html#onboarding'}]);
  assert.deepEqual(exits,['https://ringlochid.me/leotabs/uninstalled/']);
  assert.equal(new URL(UNINSTALL_URL).search,'');
});
test('extension reloads, upgrades and browser updates never open onboarding tabs',async()=>{
  for(const reason of ['update','chrome_update','shared_module_update']) {
    const {browser,pages,exits}=fixture();
    await handleInstalled(browser,{reason,previousVersion:'0.14.0'});
    assert.deepEqual(pages,[]);
    assert.deepEqual(exits,[UNINSTALL_URL]);
  }
});
test('a rejected uninstall registration does not stop the guided library',async()=>{
  const {browser,pages}=fixture();
  browser.runtime.setUninstallURL=async()=>{throw Error('Unavailable');};
  await assert.rejects(handleInstalled(browser,{reason:'install'}),/Unavailable/);
  assert.equal(pages.length,1);
});
test('an onboarding-tab failure still registers the uninstall destination',async()=>{
  const {browser,exits}=fixture();
  browser.tabs.create=async()=>{throw Error('Window closed');};
  await assert.rejects(handleInstalled(browser,{reason:'install'}),/Window closed/);
  assert.deepEqual(exits,[UNINSTALL_URL]);
});
