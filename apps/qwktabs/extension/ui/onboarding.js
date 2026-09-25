
import {el,button,task} from './shared.js';

export const TOUR_KEY='leotabs-onboarding-v1';
const steps=[
  {title:'Welcome to LeoTabs',text:'Choose your theme.',kind:'welcome'},
  {title:'Save tabs',text:'Drag tabs from the sidebar into a collection.',target:'#tabs',kind:'save',media:['save-tabs',960,640]},
  {title:'Stash all tabs',text:'Save your open tabs as a collection and close them.',target:'#tab-tools',kind:'stash',media:['stash-tabs',960,568]},
  {title:'Organize saved tabs',text:'Select saved tabs and drag them into a new collection.',kind:'organize',media:['organize',1080,600]},
  {title:'Switch collections',text:'Switch collections to replace your open tabs with a saved set.',kind:'collections',media:['switch-collections',1280,608]},
  {title:'Organize with spaces',text:'Keep each project in its own space.',target:'#spaces',kind:'spaces'},
  {title:'Search your library',target:'#tab-search',kind:'search'},
  {title:'Switch tabs',kind:'switcher',media:['switch-tabs',1080,504]},
  {title:'Pin LeoTabs for quick access',kind:'pin',media:['pin',818,430]},
  {title:'Import saved tabs',text:'Bring your bookmarks or a LeoTabs backup.',kind:'import'},
];

export function createOnboarding({onImport,getTheme,onTheme}) {
  let current=null,opening=false;
  function syncTheme() {
    for(const choice of current?.querySelectorAll('[data-tour-theme]') || [])
      choice.setAttribute('aria-pressed',String(choice.dataset.tourTheme===getTheme()));
  }
  async function open({automatic=false}={}) {
    if(current || opening)return;
    opening=true;
    try {
      const stored=await chrome.storage.local.get(TOUR_KEY);
      if(automatic && stored[TOUR_KEY]) {clearRoute();return;}
      if(document.querySelector('dialog[open]')) {clearRoute();return;}
      // Remember the first showing, including a refresh before Skip or Done.
      await chrome.storage.local.set({[TOUR_KEY]:{status:'shown'}});
      const previous=document.activeElement;
      const shade=el('div',{class:'tour-shade','aria-hidden':'true'});
      const highlight=el('div',{class:'tour-highlight','aria-hidden':'true',hidden:true});
      const dialog=el('dialog',{id:'onboarding-dialog','aria-labelledby':'tour-title'});
      document.body.append(shade,highlight,dialog);
      let index=0,frame=0,closed=false,commands=[],movement=null,resumePlayback=false;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      current=dialog;
      const schedule=()=>{
        cancelAnimationFrame(frame);
        frame=requestAnimationFrame(()=>{if(!movement)position();});
      };
      const resize=new ResizeObserver(schedule);
      resize.observe(dialog);
      const mutations=new MutationObserver(schedule);
      mutations.observe(document.querySelector('.app-shell'),{childList:true,subtree:true});
      window.addEventListener('resize',schedule);
      window.addEventListener('scroll',schedule,true);
      document.addEventListener('visibilitychange',visibilityChanged);
      reduced.addEventListener('change',motionPreference);
      function stopVideo() {
        const video=dialog.querySelector('video');
        if(video){video.pause();video.removeAttribute('src');video.load();}
        resumePlayback=false;
      }
      function visibilityChanged() {
        const video=dialog.querySelector('video');
        if(!video)return;
        if(document.hidden){resumePlayback=!video.paused;video.pause();}
        else if(resumePlayback){resumePlayback=false;video.play().catch(()=>{});}
      }
      function stopMotion() {
        movement=null;
        for(const animation of dialog.getAnimations({subtree:true}))animation.cancel();
        for(const animation of highlight.getAnimations())animation.cancel();
      }
      function motionPreference() {
        if(reduced.matches){
          stopMotion();position();resumePlayback=false;
          const video=dialog.querySelector('video');
          if(video){video.autoplay=false;video.pause();}
        }
      }
      function close(status='skipped',action) {
        if(closed)return;
        closed=true;
        chrome.storage.local.set({[TOUR_KEY]:{status}}).catch(()=>{});
        clearRoute();stopMotion();stopVideo();
        dialog.close();dialog.remove();shade.remove();highlight.remove();
        resize.disconnect();mutations.disconnect();cancelAnimationFrame(frame);
        window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
        document.removeEventListener('visibilitychange',visibilityChanged);
        reduced.removeEventListener('change',motionPreference);
        current=null;
        const focus=previous?.isConnected && previous!==document.body ? previous : document.querySelector('#tab-search');
        focus?.focus({preventScroll:true});
        action?.();
      }
      function position() {
        if(closed)return;
        const padding=16,gap=16,w=dialog.offsetWidth,h=dialog.offsetHeight;
        const vw=document.documentElement.clientWidth,vh=innerHeight;
        const clamp=(value,size,max)=>Math.max(padding,Math.min(value,max-size-padding));
        // General steps always use the viewport center, never the previous anchor.
        let x=(vw-w)/2,y=(vh-h)/2,anchored=false;
        const target=steps[index].target && document.querySelector(steps[index].target);
        const rect=target?.getBoundingClientRect();
        if(rect && rect.width && rect.height && rect.bottom>0 && rect.top<vh && rect.right>0 && rect.left<vw) {
          const left=Math.max(5,rect.left-4),top=Math.max(5,rect.top-4);
          const right=Math.min(vw-5,rect.right+4),bottom=Math.min(vh-5,rect.bottom+4);
          if(right+gap+w<=vw-padding) {x=right+gap;y=clamp(top,h,vh);anchored=true;}
          else if(bottom+gap+h<=vh-padding) {x=clamp((left+right-w)/2,w,vw);y=bottom+gap;anchored=true;}
          else if(top-gap-h>=padding) {x=clamp((left+right-w)/2,w,vw);y=top-gap-h;anchored=true;}
          // If there is no room beside the control, show a centered dialog.
          if(anchored)Object.assign(highlight.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
        }
        highlight.hidden=!anchored;shade.hidden=anchored;
        dialog.dataset.placement=anchored?'anchored':'center';
        dialog.style.left=clamp(x,w,vw)+'px';dialog.style.top=clamp(y,h,vh)+'px';
      }
      function control(label,handler,className='') {
        return button(label,handler,{className});
      }
      function render() {
        stopVideo();
        const step=steps[index];
        const title=el('h2',{id:'tour-title',tabIndex:-1},step.title);
        const body=el('div',{class:'dialog-body tour-body'});
        if(step.text)body.append(el('p',{},step.text));
        if(step.kind==='welcome') {
          const choices=el('div',{class:'tour-themes',role:'group','aria-label':'Theme'});
          for(const [value,label] of [['system','System'],['dark','Dark'],['light','Light']]) {
            const choice=control(label,task(async()=>{
              if(value===getTheme())return;
              const buttons=[...choices.querySelectorAll('button')];
              buttons.forEach(item=>item.disabled=true);
              try {await onTheme(value);syncTheme();}
              finally {buttons.forEach(item=>item.disabled=false);}
            }),'dialog-action');
            choice.dataset.tourTheme=value;
            choices.append(choice);
          }
          body.append(choices);
        }
        if(step.kind==='import')
          body.append(control('Import',()=>close('completed',onImport),'dialog-action tour-import'));
        if(step.kind==='search')
          body.append(el('p',{},'Press ',el('kbd',{},'/'),' to search your library.'));
        if(step.kind==='switcher') {
          const shortcut=commands.find(command=>command.name==='open-switcher')?.shortcut;
          body.append(shortcut
            ? el('p',{},'Press ',el('kbd',{},shortcut),' to switch between open tabs.')
            : el('p',{},'Choose a page in the visual tab switcher.'));
        }
        if(step.kind==='pin') {
          const shortcut=commands.find(command=>command.name==='open-library')?.shortcut;
          body.append(shortcut
            ? el('p',{},'Or press ',el('kbd',{},shortcut),' to open the library.')
            : el('p',{},'Use the pin beside LeoTabs in your browser’s Extensions menu.'));
        }
        if(step.media) {
          const [name,width,height]=step.media;
          const video=el('video',{
            class:'tour-video',muted:true,playsInline:true,loop:true,controls:true,
            autoplay:!reduced.matches && !document.hidden,preload:'metadata',
            width,height,tabIndex:0,disablePictureInPicture:true,
            poster:'media/onboarding/'+name+'.jpg',src:'media/onboarding/'+name+'.mp4',
            'aria-label':step.title+' demonstration',
          });
          resumePlayback=!reduced.matches && document.hidden;
          video.addEventListener('loadeddata',schedule);
          video.addEventListener('error',()=>{
            if(!video.isConnected || !video.hasAttribute('src'))return;
            video.hidden=true;
            body.append(el('p',{class:'hint',role:'status'},'The recording could not load.'));
            schedule();
          });
          body.append(video);
        }
        const dots=el('nav',{class:'tour-dots','aria-label':'Guide steps'});
        steps.forEach((item,i)=>dots.append(el('button',{
          type:'button',title:item.title,'aria-label':'Step '+(i+1)+': '+item.title,
          ...(i===index?{'aria-current':'step'}:{}),onclick:()=>go(i),
        },el('span',{'aria-hidden':'true'}))));
        dialog.replaceChildren(
          el('div',{class:'tour-step'},
            el('header',{class:'dialog-head'},title,el('span',{class:'tour-counter'},(index+1)+' of '+steps.length)),body),
          el('footer',{class:'tour-footer'},
            control('Skip',()=>close(),'tour-skip'),
            ...(index?[control('Back',()=>go(index-1))]:[]),
            control(index===steps.length-1?'Done':'Next',()=>index===steps.length-1?close('completed'):go(index+1),'primary')),
          dots);
        dialog.dataset.step=String(index+1);
        dialog.dataset.kind=step.kind;
        dialog.dataset.media=String(!!step.media);
        dialog.scrollTop=0;
        syncTheme();
      }
      function go(next) {
        if(next===index)return;
        const before=dialog.getBoundingClientRect();
        const oldHighlight=highlight.hidden?null:highlight.getBoundingClientRect();
        const direction=next>index?1:-1;
        stopMotion();index=next;
        const target=steps[index].target && document.querySelector(steps[index].target);
        target?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
        render();position();
        dialog.querySelector('#tour-title').focus({preventScroll:true});
        if(reduced.matches)return;
        const after=dialog.getBoundingClientRect();
        const timing={duration:200,easing:'cubic-bezier(.2,.8,.2,1)'};
        const animation=dialog.animate([
          {left:before.left+'px',top:before.top+'px',width:before.width+'px',height:before.height+'px'},
          {left:after.left+'px',top:after.top+'px',width:after.width+'px',height:after.height+'px'},
        ],{...timing,id:'tour-position'});
        movement=animation;
        dialog.querySelector('.tour-step').animate([
          {opacity:0,transform:'translateX('+(direction*6)+'px)'},
          {opacity:1,transform:'translateX(0)'},
        ],{...timing,id:'tour-content'});
        if(oldHighlight && !highlight.hidden) {
          const end=highlight.getBoundingClientRect();
          highlight.animate([
            {left:oldHighlight.left+'px',top:oldHighlight.top+'px',width:oldHighlight.width+'px',height:oldHighlight.height+'px'},
            {left:end.left+'px',top:end.top+'px',width:end.width+'px',height:end.height+'px'},
          ],timing);
        }
        animation.finished.then(()=>{
          if(movement===animation){movement=null;position();}
        }).catch(()=>{});
      }
      dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
      dialog.addEventListener('close',()=>close());
      dialog.addEventListener('keydown',event=>{
        if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();
          if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
          else close();
        }
        if(event.key==='Tab') {
          const controls=[...dialog.querySelectorAll('button:not(:disabled),video')].filter(node=>node.getClientRects().length);
          const first=controls[0],last=controls.at(-1),active=document.activeElement;
          if(event.shiftKey && (active===first || active===dialog.querySelector('#tour-title'))) {
            event.preventDefault();last?.focus();
          } else if(!event.shiftKey && active===last) {event.preventDefault();first?.focus();}
        }
      });
      commands=await chrome.commands.getAll().catch(()=>[]);
      render();dialog.showModal();position();
      dialog.querySelector('#tour-title').focus({preventScroll:true});
    } finally {opening=false;}
  }
  function clearRoute(){if(['#onboarding','#tour'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search);}
  return {open,syncTheme};
}
