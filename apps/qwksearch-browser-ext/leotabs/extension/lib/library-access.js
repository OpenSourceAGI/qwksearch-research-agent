
export function libraryAccess(browser) {
  const url=query=>browser.runtime.getURL('app.html')+(query?'#q='+encodeURIComponent(query):'');
  async function open(query='',disposition='currentTab') {
    const target=url(query);
    if(disposition==='window')return browser.windows.create({url:target,type:'popup',width:1200,height:850});
    if(disposition==='currentTab') {
      const tabs=await browser.tabs.query({active:true,currentWindow:true});
      if(tabs[0])return browser.tabs.update(tabs[0].id,{url:target});
    }
    return browser.tabs.create({url:target,active:disposition!=='newBackgroundTab'});
  }
  function register() {
    browser.omnibox.setDefaultSuggestion({description:'Open LeoTabs Library or search your tabs and collections: %s'});
    browser.omnibox.onInputEntered.addListener((text,disposition)=>open(text.trim(),disposition).catch(()=>{}));
  }
  return {open,register,url};
}
