
// The guide uses headings, paragraphs, lists, tables, links and fenced code.
// Escape raw HTML and allow only safe navigational link protocols.
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderGuide(markdown, resolveLink=x=>x) {
  const ids=new Map();
  function inline(text) {
    const tokens=[];
    const hold=html=>`\u0000${tokens.push(html)-1}\u0000`;
    text=text.replace(/`([^`]+)`/g,(_,code)=>hold('<code>'+escapeHTML(code)+'</code>'));
    text=text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(_,label,url)=>{
      const href=resolveLink(url);
      if(/^[a-z][a-z\d+.-]*:/i.test(href)&&!/^https?:|^mailto:/i.test(href))throw Error('Unsafe guide link');
      return hold('<a href="'+escapeHTML(href)+'">'+escapeHTML(label)+'</a>');
    });
    return escapeHTML(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\u0000(\d+)\u0000/g,(_,index)=>tokens[Number(index)]);
  }
  const lines=markdown.replace(/\r\n/g,'\n').split('\n'),out=[];
  for(let i=0;i<lines.length;){
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    if(line.startsWith('```')){
      const body=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))body.push(lines[i++]);
      if(i===lines.length)throw Error('Unclosed guide code fence');i++;
      out.push('<pre><code>'+escapeHTML(body.join('\n'))+'</code></pre>');continue;
    }
    const heading=line.match(/^(#{1,6}) (.+)$/);
    if(heading){const base=heading[2].toLowerCase().replace(/[^a-z\d -]/g,'').trim().replace(/ +/g,'-'),n=ids.get(base)||0;ids.set(base,n+1);const id=base+(n?'-'+n:'');out.push(`<h${heading[1].length} id="${id}">${inline(heading[2])}</h${heading[1].length}>`);i++;continue;}
    if(line.startsWith('|')&&/^\|[\s:|\-]+\|$/.test(lines[i+1]||'')){
      const cells=row=>row.trim().slice(1,-1).split('|').map(s=>s.trim());
      out.push('<div class="guide-table"><table><thead><tr>'+cells(line).map(s=>'<th scope="col">'+inline(s)+'</th>').join('')+'</tr></thead><tbody>');i+=2;
      while(i<lines.length&&lines[i].startsWith('|'))out.push('<tr>'+cells(lines[i++]).map(s=>'<td>'+inline(s)+'</td>').join('')+'</tr>');
      out.push('</tbody></table></div>');continue;
    }
    const list=line.match(/^(-|\d+\.) (.+)$/);
    if(list){const ordered=list[1]!=='-',tag=ordered?'ol':'ul',pattern=ordered?/^\d+\. (.+)$/:/^- (.+)$/;out.push('<'+tag+'>');let item;while(i<lines.length&&(item=lines[i].match(pattern))){out.push('<li>'+inline(item[1])+'</li>');i++;}out.push('</'+tag+'>');continue;}
    const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,6} |```|\||- |\d+\. )/.test(lines[i]))paragraph.push(lines[i++]);
    out.push('<p>'+inline(paragraph.join(' '))+'</p>');
  }
  return out.join('\n');
}
export async function guidePages(fs) {
  const names=(await fs.readdir('docs')).filter(n=>n.endsWith('.md')).sort();
  return Promise.all(names.map(async file=>{
    const markdown=await fs.readFile('docs/'+file,'utf8');
    const title=markdown.match(/^# (.+)$/m)?.[1];if(!title)throw Error('Guide needs a title: '+file);
    return {file,slug:file==='README.md'?'docs':'docs/'+file.slice(0,-3),title,markdown};
  }));
}
