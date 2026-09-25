import test from 'node:test';
import assert from 'node:assert/strict';
import {organiseCollection,organiseTabs,applyCollectionOrganisation} from '../extension/lib/collection-ai.js';
import {askJSON} from '../extension/lib/integrations.js';
import {topicGroups} from '../extension/lib/topic-groups.js';
const fixture=()=>({id:'c',name:'New collection',note:'Compare tools',groups:[],links:[{id:'long-id-chatgpt',title:'ChatGPT',url:'https://chatgpt.com/'},{id:'long-id-gemini',title:'Gemini',url:'https://gemini.google.com/'},{id:'long-id-google',title:'Google',url:'https://google.com/'}]});
const settings={provider:'compatible',model:'fixture',aiEndpoint:'http://127.0.0.1:1234/chat/completions'};
const aiResponse=groups=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'AI research',note:'Compare research tools.',groups})}}]}));

test('collection AI accepts exact numeric-string IDs without another request',async()=>{
 const c=fixture();let calls=0;
 const plan=await organiseCollection(c,settings,'',async()=>{calls++;return aiResponse([{name:'Research',ids:['1','2']}]);});
 assert.equal(calls,1);
 assert.deepEqual(plan.groups[0].linkIds,c.links.slice(0,2).map(l=>l.id));
});

test('an invalid AI reference gets one correction attempt without touching excluded links',async()=>{
 const c=fixture();c.groups=[{id:'keep',name:'Manual group',color:'blue'}];c.links[2].groupId='keep';
 const before=structuredClone(c);let calls=0;
 const plan=await organiseCollection(c,settings,'',async(_url,options)=>{
   calls++;
   if(calls===2){const prompt=JSON.parse(options.body).messages[0].content;assert(prompt.includes('correction'));assert(prompt.includes('[1,2]'));assert.deepEqual(c,before);}
   return aiResponse([{name:'Research',ids:calls===1?[1,3]:[1,2]}]);
 },{regroupExisting:false});
 assert.equal(calls,2);applyCollectionOrganisation(c,plan,()=> 'mint');
 assert.equal(c.links[2].groupId,'keep');assert.deepEqual(c.groups.find(g=>g.id==='keep'),before.groups[0]);
});

test('repeated invalid IDs stop after one correction and never mutate the collection',async()=>{
 for(const id of [0,99,true,null,'1.5','1e0','0x1','link-1']){
   const c=fixture(),before=structuredClone(c);let calls=0;
   await assert.rejects(organiseCollection(c,settings,'',async()=>{calls++;return aiResponse([{name:'Bad',ids:[id,2]}]);}),/outside the selection/);
   assert.equal(calls,2);assert.deepEqual(c,before);
 }
});

test('authentication failures and cancellation do not trigger AI correction requests',async()=>{
 let calls=0;
 await assert.rejects(organiseCollection(fixture(),settings,'',async()=>{calls++;return new Response('',{status:401});}),/rejected the API key/);
 assert.equal(calls,1);
 const controller=new AbortController();calls=0;
 await assert.rejects(organiseCollection(fixture(),settings,'',async()=>{calls++;controller.abort();return aiResponse([{name:'Bad',ids:[99]}]);},{signal:controller.signal}),/cancelled|abort/i);
 assert.equal(calls,1);
});

test('correction keeps original sparse IDs and never groups excluded context',async()=>{
 const c=fixture();c.links.push({id:'extra',title:'Another resource',url:'https://resource.example/'});
 c.groups=[{id:'manual',name:'Keep this group'}];c.links[0].groupId='manual';c.links[2].groupId='manual';
 let calls=0;
 const plan=await organiseCollection(c,settings,'',async(_url,options)=>{
   const prompt=JSON.parse(options.body).messages[0].content;
   assert.deepEqual(JSON.parse(prompt.split('\nData: ')[1]).groupable,[2,4]);
   calls++;return aiResponse([{name:'Research',ids:calls===1?[1,2]:['2','4']}]);
 },{regroupExisting:false});
 assert.equal(calls,2);assert.deepEqual(plan.groups[0].linkIds,[c.links[1].id,c.links[3].id]);
 c.note='User edited this during the request';
 assert.throws(()=>applyCollectionOrganisation(c,plan,()=> 'mint'),/collection changed/);
});

test('malformed JSON can be corrected and duplicate assignments remain invalid',async()=>{
 let calls=0;
 const plan=await organiseCollection(fixture(),settings,'',async()=>{
   calls++;
   if(calls===1)return new Response(JSON.stringify({choices:[{message:{content:'{broken'}}]}));
   return aiResponse([{name:'Research',ids:[1,2]}]);
 });
 assert.equal(calls,2);assert.equal(plan.groups.length,1);
 calls=0;
 await assert.rejects(organiseCollection(fixture(),settings,'',async()=>{calls++;return aiResponse([{name:'Duplicate',ids:[1,'1']}]);}),/missing or repeated links/);
 assert.equal(calls,2);
});

test('all grouped links can remain excluded while AI updates the collection metadata',async()=>{
 const c=fixture();c.groups=[{id:'keep',name:'Existing group'}];c.links.forEach(l=>l.groupId='keep');
 const links=structuredClone(c.links);let calls=0;
 const plan=await organiseCollection(c,settings,'',async(_url,options)=>{
   calls++;
   if(calls===2)assert(JSON.parse(options.body).messages[0].content.includes('return groups: []'));
   return aiResponse(calls===1?[{name:'Example IDs',ids:[1,2]}]:[]);
 },{regroupExisting:false});
 applyCollectionOrganisation(c,plan,()=> 'mint');
 assert.equal(calls,2);assert.deepEqual(c.links,links);assert.equal(c.groups[0].name,'Existing group');
 assert.equal(c.name,'AI research');
});
test('collection AI combines name, overview and cross-site topic grouping in one compact request',async()=>{
 let calls=0;const c=fixture();
 const plan=await organiseCollection(c,settings,'',async(_url,options)=>{calls++;const payload=JSON.parse(JSON.parse(options.body).messages[0].content.split('\nData: ')[1]);assert.deepEqual(payload.links.map(l=>l.id),[1,2,3]);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'AI tools and search',note:'Compare AI chatbots and keep Google as a search reference.',groups:[{name:'ChatGPT',ids:[1]},{name:'Gemini',ids:[2]},{name:'Search',ids:[3]}]})}}]}));});
 assert.equal(calls,1);assert.deepEqual(plan.groups.map(g=>[g.name,g.linkIds]),[['AI chatbots',['long-id-chatgpt','long-id-gemini']]]);
 applyCollectionOrganisation(c,plan,()=> 'mint');assert.equal(c.name,'AI tools and search');assert(plan.note&&c.note===plan.note);assert.equal(c.groups.length,1);assert.equal(c.links[0].groupId,null);
 assert.deepEqual(c.links.map(l=>l.title),['Google','ChatGPT','Gemini']);
});
test('collection AI rejects unknown IDs and preserves excluded existing groups',async()=>{
 const c=fixture();c.groups=[{id:'existing',name:'My project',color:'blue'}];c.links[0].groupId='existing';c.links[1].groupId='existing';
 const response=()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'Updated',note:'Overview',groups:[{name:'Bad',ids:[1,3]}]})}}]}));
 await assert.rejects(organiseCollection(c,settings,'',response,{regroupExisting:false}),/outside the selection/);
});
test('including existing groups omits their labels and memberships from the collection AI input',async()=>{
 const c=fixture();c.groups=[{id:'old',name:'Old website grouping',color:'blue'}];c.links[0].groupId='old';
 await organiseCollection(c,settings,'',async(_url,options)=>{
   const prompt=JSON.parse(options.body).messages[0].content,payload=JSON.parse(prompt.split('\nData: ')[1]);
   assert(!prompt.includes('Old website grouping'));assert(payload.links.every(l=>!('group' in l)&&!('groupId' in l)));assert.deepEqual(payload.groupable,[1,2,3]);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'AI research',note:'Compare tools.',groups:[{name:'AI chatbots',ids:[1,2]}]})}}]}));
 },{regroupExisting:true});
});
test('excluded saved groups keep their membership even when AI proposes the same group name',async()=>{
 const c=fixture();c.groups=[{id:'old',name:'Research',color:'blue',collapsed:true}];c.links[2].groupId='old';
 c.links[0].url='https://one.example/';c.links[1].url='https://two.example/';
 const plan=await organiseCollection(c,settings,'',async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'Research',note:'Overview',groups:[{name:'Research',ids:[1,2]}]})}}]})),{regroupExisting:false});
 applyCollectionOrganisation(c,plan,()=> 'mint');
 assert.deepEqual(c.groups.find(g=>g.id==='old'),{id:'old',name:'Research',color:'blue',collapsed:true});
 assert.deepEqual(c.links.filter(l=>l.groupId==='old').map(l=>l.id),['long-id-google']);
 const generated=c.links.filter(l=>l.groupId!=='old');assert.equal(generated.length,2);assert.equal(generated[0].groupId,generated[1].groupId);
});
test('topic grouping drops singleton groups and combines duplicates without a catch-all',()=>{
 const links=[{id:1,url:'https://a.example'},{id:2,url:'https://b.example'},{id:3,url:'https://c.example'}];
 assert.deepEqual(topicGroups([{name:'Project',linkIds:[1]},{name:'Project',linkIds:[2]},{name:'Other',linkIds:[3]}],links).map(g=>[g.name,g.linkIds]),[['Project',[1,2]]]);
});

test('fast organisation uses supported GPT-5 mini latency knobs without changing other model requests',async()=>{
 const bodies=[];const fetcher=async(_url,options)=>{bodies.push(JSON.parse(options.body));return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}));};
 await askJSON('JSON', {...settings,model:'gpt-5-mini'},'',fetcher,{fast:true});
 assert.equal(bodies[0].reasoning_effort,'minimal');assert.equal(bodies[0].verbosity,'low');assert.equal(bodies[0].model,'gpt-5-mini');
 await askJSON('JSON', {...settings,model:'gpt-4.1-mini'},'',fetcher,{fast:true});assert(!('reasoning_effort' in bodies[1]));assert(!('verbosity' in bodies[1]));
 await askJSON('JSON', {...settings,model:'gpt-5-mini'},'',fetcher);assert(!('reasoning_effort' in bodies[2]));
});

test('saved and open versions of the same research tabs send identical AI requests',async()=>{
 const topics=[
  ['BERT and language models',['1810.04805','BERT · Hugging Face','BERT: Pre-training of Deep Bidirectional Transformers']],
  ['Frontend web development',['place-items - Tailwind CSS','useDeferredValue – React']],
  ['Programming language references',['Data model — Python','C# Guide','Generator.prototype.next()','Go specification','TypeScript Optional Parameters']],
  ['Python web and data tools',['Use time-travel — LangChain','Validation Errors | Pydantic','WebSockets - FastAPI']],
  ['PyTorch neural network components',['GELU — PyTorch','LayerNorm — PyTorch','Linear — PyTorch','Transformer — PyTorch']],
 ];
 const c={id:'research',name:'Programming and Machine Learning',note:'Reference materials for programming and machine learning.',groups:[],links:[]};
 const answer=[];
 for(const [name,titles] of topics){const ids=[];for(const title of titles){const id=c.links.length+1;ids.push(id);c.links.push({id:'saved-'+id,title,url:'https://docs.example/'+id,note:id===1?'Compare BERT references.':''});}answer.push({name,ids});}
 const tabs=c.links.map((l,i)=>({id:100001+i,title:l.title,url:l.url,groupId:i%2?71:-1})).reverse();
 const before=structuredClone({c,tabs}),requests=[];
 const fetcher=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return aiResponse(answer);};
 const saved=await organiseCollection(c,settings,'',fetcher);
 const open=await organiseTabs(tabs,settings,'',fetcher,{collection:c});
 assert.deepEqual(requests[0],requests[1],'Surface-specific prompts or settings must not change the grouping request');
 assert.deepEqual(open.map(g=>[g.name,g.tabIds.map(id=>tabs.find(t=>t.id===id).url)]),saved.groups.map(g=>[g.name,g.linkIds.map(id=>c.links.find(l=>l.id===id).url)]));
 assert.deepEqual({c,tabs},before,'Planning must not alter tabs or collection metadata');
 assert(open.every(g=>Object.keys(g).sort().join(',')==='name,tabIds'));
});

test('open-tab grouping shares bounded repair and maps compact IDs back to native tabs',async()=>{
 const tabs=[0,1,2,3].map(i=>({id:900000+i,title:'Reference '+i,url:'https://example.org/'+i,groupId:i%2?-1:23}));
 let calls=0;
 const groups=await organiseTabs(tabs,settings,'',async(_url,options)=>{
  const payload=JSON.parse(JSON.parse(options.body).messages[0].content.split('\nData: ')[1]);
  assert.deepEqual(payload.groupable,[2,4]);assert.deepEqual(payload.links.map(l=>l.id),[1,2,3,4]);
  assert(payload.links.every(l=>!('groupId' in l)));
  return aiResponse([{name:'Useful references',ids:++calls===1?[1,2]:['2','4']}]);
 },{regroupExisting:false});
 assert.equal(calls,2);assert.deepEqual(groups,[{name:'Useful references',tabIds:[900001,900003]}]);
});

test('open-tab context preserves duplicate-page notes but excludes an unrelated collection overview',async()=>{
 const c={name:'Private project overview',note:'Not relevant to the full selection',groups:[],links:[
  {id:'a',title:'First document',url:'https://example.org/document',note:'First note'},
  {id:'b',title:'Second document',url:'https://example.org/document',note:'Second note'},
  {id:'other',title:'Unselected resource',url:'https://example.org/hidden',note:'Do not send this note'},
 ]};
 const tabs=[{id:51,title:'Second document',url:'https://example.org/document',groupId:-1},{id:52,title:'First document',url:'https://example.org/document',groupId:-1},{id:53,title:'Unrelated',url:'https://elsewhere.example',groupId:-1}];
 await organiseTabs(tabs,settings,'',async(_url,options)=>{
  const prompt=JSON.parse(options.body).messages[0].content,payload=JSON.parse(prompt.split('\nData: ')[1]);
  assert.equal(payload.name,'Open tabs');assert.equal(payload.note,'');
  assert.deepEqual(payload.links.map(l=>l.note),['Second note','First note','']);
  assert(!prompt.includes('Private project'));assert(!prompt.includes('Do not send this note'));
  return aiResponse([{name:'Documents',ids:[1,2]}]);
 },{collection:c});
});

test('an all-excluded open-tab action sends no AI request',async()=>{
 let calls=0;
 await assert.rejects(organiseTabs([{id:1,title:'Existing group',url:'https://example.org',groupId:7}],settings,'',async()=>{calls++;return aiResponse([]);},{regroupExisting:false}),/Select 1–300 tabs/);
 assert.equal(calls,0);
});
