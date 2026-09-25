
const chatbots=new Set(['chatgpt.com','chat.openai.com','gemini.google.com','claude.ai','chat.deepseek.com','copilot.microsoft.com','poe.com','chat.qwen.ai']);
export function topicGroups(groups,links,key='linkIds') {
  const byName=new Map();
  for(const group of groups){const name=String(group.name||'').trim();if(!byName.has(name))byName.set(name,{...group,name,[key]:[]});byName.get(name)[key].push(...group[key]);}
  const bots=links.filter(l=>{try{return chatbots.has(new URL(l.resourceUrl||l.url).hostname);}catch{return false;}}).map(l=>l.id);
  const values=[...byName.values()];
  // A common-purpose topic should not be fragmented into one brand per group.
  if(bots.length>=2){for(const group of values)group[key]=group[key].filter(id=>!bots.includes(id));values.push({name:'AI chatbots',[key]:bots,accepted:true});}
  return values.filter(g=>g[key].length>=2);
}
