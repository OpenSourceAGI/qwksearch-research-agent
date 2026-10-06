
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(p=>p.endsWith('.md')))];
let count=0;
for(const file of files){
  let text;try{text=await fs.readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
  count++;
  if(/(?:C:[\\/]Users[\\/](?!<)|\/Users\/(?!<))|\.codex[\\/]/i.test(text))throw Error('Personal workstation path in '+file);
  for(const [,url] of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)){
    if(/^(?:https?:|mailto:|#)/.test(url))continue;
    const target=path.resolve(path.dirname(file),url.split('#')[0]);
    if(!target.startsWith(root+path.sep))throw Error('Documentation link escapes repository: '+file);
    await fs.stat(target);
  }
}
const index=await fs.readFile('docs/README.md','utf8');
for(const file of await fs.readdir('docs'))if(file.endsWith('.md')&&file!=='README.md'&&!index.includes('('+file+')'))throw Error('Guide missing from index: '+file);
console.log(`Checked ${count} Markdown files: local links, guide index coverage and no personal workstation paths.`);
