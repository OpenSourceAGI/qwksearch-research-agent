
import {suffixes} from './public-suffixes.js';
const suffixRules=new Set(suffixes.split('\n'));
const aliases={'github.com':'GitHub','gitlab.com':'GitLab','chatgpt.com':'ChatGPT','gemini.google.com':'Gemini','mail.google.com':'Gmail','docs.google.com':'Google Docs','drive.google.com':'Google Drive','webstore.google.com':'Chrome Web Store','microsoftedge.microsoft.com':'Edge Add-ons','youtube.com':'YouTube','stackoverflow.com':'Stack Overflow'};
export function website(url) {
  let host;try {const u=new URL(url);if(!['http:','https:','file:'].includes(u.protocol))return null;if(u.protocol==='file:')return {key:'site:file',name:'Local files'};host=u.hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}
  if(/^[\d.]+$/.test(host)||host.includes(':')||!host.includes('.'))return {key:'site:'+host,name:host};
  const labels=host.split('.');let size=1;
  for(let i=0;i<labels.length;i++) {
    const tail=labels.slice(i).join('.');
    if(suffixRules.has('!'+tail)){size=labels.length-i-1;break;}
    if(suffixRules.has(tail)||i>0&&suffixRules.has('*.'+tail))size=Math.max(size,labels.length-i+(suffixRules.has('*.'+tail)&&i>0?1:0));
  }
  const stem=labels.slice(0,Math.max(1,labels.length-size)).join('.');
  return {key:'site:'+host,name:aliases[host]||stem.charAt(0).toUpperCase()+stem.slice(1)};
}
export const RULE_PRESETS=[
 {id:'ai-tools',name:'Combine AI tools',description:'ChatGPT, Gemini and Claude together',rules:[{domain:'chatgpt.com',group:'AI tools'},{domain:'gemini.google.com',group:'AI tools'},{domain:'claude.ai',group:'AI tools'}]},
 {id:'github-projects',name:'Separate GitHub projects',description:'One group per repository',rules:[{domain:'github.com/*/*',group:'GitHub · {project}'}]},
 {id:'google-work',name:'Google work',description:'Gmail, Drive and Docs together',rules:[{domain:'mail.google.com',group:'Google work'},{domain:'drive.google.com',group:'Google work'},{domain:'docs.google.com',group:'Google work'}]},
];
export const NATIVE_COLOURS=['blue','red','yellow','green','pink','purple','cyan','orange','grey'];
export function variedColour(used=[]) {const choices=NATIVE_COLOURS.filter(c=>!used.includes(c));const pool=choices.length?choices:NATIVE_COLOURS;return pool[Math.floor(Math.random()*pool.length)];}
