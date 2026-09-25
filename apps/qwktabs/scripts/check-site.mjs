
import fs from 'node:fs/promises';
import path from 'node:path';
import {guidePages,renderGuide} from './guide-markdown.mjs';
const root=path.resolve('output/site');
const config=JSON.parse(await fs.readFile('website/config.json','utf8'));
const guides=await guidePages(fs);
const pages=['index.html',...['privacy','permissions','support','changelog','uninstalled',...guides.map(g=>g.slug)].map(s=>s+'/index.html')];
for(const file of pages){
  const full=path.join(root,file),html=await fs.readFile(full,'utf8');
  const prefix='../'.repeat(file.split('/').length-1);
  const themeTag='<script src="'+prefix+'assets/theme.js"></script>';
  if(html.split(themeTag).length!==2)throw Error('Expected one local theme script in '+file);
  const videoTag='<script src="assets/video.js" defer></script>';
  if(file==='index.html' && html.split(videoTag).length!==2)throw Error('Expected the local video script on the homepage.');
  const permittedScripts=html.replace(themeTag,'').replace(file==='index.html'?videoTag:'\0','');
  if(/<script|<iframe|\son\w+=|\{\{/i.test(permittedScripts))throw Error('Unexpected script, eagerly loaded embed or unresolved placeholder in '+file);
  if(file==='index.html' && (!html.includes('data-video-id="'+config.videoId+'"') || !html.includes("frame-src https://www.youtube-nocookie.com")))throw Error('Missing video trigger or player CSP.');
  if(!html.includes('aria-label="Colour theme"'))throw Error('Missing accessible theme control in '+file);
  if((html.match(/<h1\b/g)||[]).length!==1)throw Error('Expected one h1 in '+file);
  if(!html.includes('support@ringlochid.me'))throw Error('Missing contact in '+file);
  if(config.origin){
    const route=file==='index.html'?'':file.slice(0,-'index.html'.length);
    if(!html.includes('<link rel="canonical" href="'+new URL(route,config.origin).href+'">'))throw Error('Incorrect canonical URL in '+file);
    if(file==='uninstalled/index.html') {
      if(!html.includes('content="noindex,nofollow"'))throw Error('The uninstall page should not be indexed.');
    } else if(html.includes('noindex'))throw Error('Published page must not be noindex: '+file);
  }
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(?:https:|mailto:|#)/.test(url))continue;
    const target=path.resolve(path.dirname(full),url.split('#')[0]);
    if(!target.startsWith(root+path.sep) && target!==root)throw Error('Link escapes site: '+url);
    const stat=await fs.stat(target);
    if(stat.isDirectory())await fs.stat(path.join(target,'index.html'));
  }
  for(const [tag] of html.matchAll(/<(?:img|link)\b[^>]*>/g))
    if(!tag.includes('rel="canonical"') && /(?:src|href)="https?:/.test(tag))throw Error('Remote asset in '+file);
}
const canonical=(await fs.readFile('extension/privacy.html','utf8')).match(/<article id="privacy-policy">([\s\S]*?)<\/article>/)[1];
const rendered=await fs.readFile(root+'/privacy/index.html','utf8');
if(!config.hostingName && !rendered.includes(canonical))throw Error('Website privacy differs from canonical source.');
for(const guide of guides){
  const html=await fs.readFile(path.join(root,guide.slug,'index.html'),'utf8');
  for(const [,title] of renderGuide(guide.markdown).matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/g))
    if(!html.includes(title))throw Error('Guide content missing: '+guide.file);
}
console.log(`Checked ${pages.length} pages and ${guides.length} shared guides: links, assets, contact, headings, approved local scripts and no eagerly loaded embeds.`);
