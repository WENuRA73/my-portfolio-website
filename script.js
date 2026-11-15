'use strict';
const header=document.getElementById('siteHeader');
const nav=document.getElementById('primaryNav');
const menuToggle=document.getElementById('menuToggle');
const navLinks=[...nav.querySelectorAll('a')];
function setMenu(open){
  nav.classList.toggle('open',open);
  menuToggle.classList.toggle('open',open);
  document.body.classList.toggle('menu-open',open);
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open?'Close menu':'Open menu');
}
menuToggle.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
navLinks.forEach(link=>link.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){setMenu(false);menuToggle.focus();}});
document.addEventListener('click',event=>{if(nav.classList.contains('open')&&!header.contains(event.target))setMenu(false);});
window.addEventListener('resize',()=>{if(innerWidth>800&&nav.classList.contains('open'))setMenu(false);},{passive:true});
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>8),{passive:true});
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    navLinks.forEach(link=>link.classList.toggle('active',link.hash==='#'+entry.target.id));
  }),{rootMargin:'-35% 0px -55% 0px'});
  document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
}

// Blend adjacent frames as scroll progress changes, instead of snapping to one image.
const hero=document.querySelector('.hero');
const heroFrame=document.getElementById('heroFrame');
const heroFrameNext=document.getElementById('heroFrameNext');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const frameCount=35;
const framePaths=Array.from({length:frameCount},(_,index)=>'images/hero-frames/frame-'+String(index+1).padStart(2,'0')+'.webp');
const frameCache=[];
const heroPlayhead={progress:0};
let heroTween;
function renderHeroFrames(){
  const frame=Math.max(0,Math.min(frameCount-1,heroPlayhead.progress*(frameCount-1)));
  const first=Math.floor(frame);
  const second=Math.min(first+1,frameCount-1);
  // Keep each frame crisp; use a short eased dissolve around the handoff.
  const transition=Math.max(0,Math.min(1,(frame-first-.34)/.32));
  const blend=transition*transition*(3-2*transition);
  const firstImage=frameCache[first];
  const secondImage=frameCache[second];
  if(firstImage?.complete&&firstImage.naturalWidth){
    if(heroFrame.src!==firstImage.src)heroFrame.src=firstImage.src;
    heroFrame.style.opacity='1';
  }
  if(second!==first&&secondImage?.complete&&secondImage.naturalWidth){
    if(heroFrameNext.src!==secondImage.src)heroFrameNext.src=secondImage.src;
    heroFrameNext.style.opacity=String(blend);
  }else heroFrameNext.style.opacity='0';
}
function syncHeroFrames(progress){
  const target=reducedMotion?0:Math.max(0,Math.min(1,progress));
  if(window.gsap&&!reducedMotion){
    heroTween?.kill();
    heroTween=gsap.to(heroPlayhead,{progress:target,duration:.22,ease:'power2.out',overwrite:true,onUpdate:renderHeroFrames});
  }else{heroPlayhead.progress=target;renderHeroFrames();}
}
framePaths.forEach((path,index)=>{
  const image=new Image();
  image.decoding='async';
  image.onload=renderHeroFrames;
  image.src=path;
  frameCache[index]=image;
});
renderHeroFrames();
if(!reducedMotion&&window.gsap&&window.ScrollTrigger){
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({
    trigger:hero,
    start:'top top',
    end:'bottom bottom',
    onUpdate:self=>syncHeroFrames(self.progress),
    onRefresh:self=>syncHeroFrames(self.progress)
  });
}else if(!reducedMotion){
  function nativeHeroScroll(){
    const travel=Math.max(1,hero.offsetHeight-innerHeight);
    syncHeroFrames((scrollY-hero.offsetTop)/travel);
  }
  window.addEventListener('scroll',nativeHeroScroll,{passive:true});
  window.addEventListener('resize',nativeHeroScroll,{passive:true});
  nativeHeroScroll();
}

// Real client projects remain separate from illustrative concepts.
const realProjectGrid=document.getElementById('realProjectGrid');
const portfolioEmpty=document.getElementById('portfolioEmpty');
const realProjects=Array.isArray(window.sitelumeProjects)?window.sitelumeProjects:[];
function addText(parent,tag,value,className){
  const element=document.createElement(tag);
  element.textContent=value;
  if(className)element.className=className;
  parent.appendChild(element);
  return element;
}
const projectGroups=[
  {key:'websites',label:'Websites',intro:'Digital storefronts and brand experiences built for real visitors.',empty:'A website case study will appear here when it is ready to share.'},
  {key:'webapps',label:'Web apps',intro:'Browser-based products, commerce flows, and tools designed around everyday tasks.',empty:'A completed web app case study is not available yet.'},
  {key:'games',label:'Games',intro:'Interactive worlds, responsive controls, and the systems that make play feel good.',empty:'Game projects will appear here.'},
  {key:'software',label:'Software',intro:'Practical systems for operations, information, and better decisions.',empty:'Software projects will appear here.'}
];
const validProjects=realProjects.filter(project=>project&&project.title&&project.description);
if(validProjects.length){
  projectGroups.forEach((group,index)=>{
    const section=document.createElement('section');
    section.className='project-category project-category-'+group.key;
    section.id='project-'+group.key;
    section.setAttribute('aria-labelledby',section.id+'-title');
    const head=addText(section,'div','','project-category-head');
    addText(head,'span',String(index+1).padStart(2,'0')+' / 04','project-category-number');
    const heading=addText(head,'h3',group.label);
    heading.id=section.id+'-title';
    addText(head,'p',group.intro);
    const cards=addText(section,'div','','project-category-cards');
    const matching=validProjects.filter(project=>project.group===group.key);
    if(matching.length===1)cards.classList.add('single');
    matching.forEach(project=>{
      const card=addText(cards,'article','','real-project-card');
      const cover=addText(card,'div','','real-project-cover');
      if(typeof project.image==='string'&&/^images\/[a-z0-9_./-]+$/i.test(project.image)&&!project.image.includes('..')){
        const image=document.createElement('img');
        image.src=project.image;
        image.alt=project.imageAlt||'Preview of '+project.title;
        image.loading='lazy';
        cover.appendChild(image);
      }else{cover.classList.add('no-image');addText(cover,'span',project.title,'project-visual-title');}
      if(project.imageLabel)addText(cover,'span',project.imageLabel,'project-cover-kind');
      addText(cover,'span',project.status||'Project','project-cover-status');
      const info=addText(card,'div','','real-project-info');
      const copy=addText(info,'div','');
      addText(copy,'small',project.category||'Sitelume project');
      addText(copy,'h4',project.title);
      addText(copy,'p',project.description);
      if(project.highlights)addText(copy,'span',project.highlights,'project-highlights');
      if(typeof project.url==='string'&&/^(https?:\/\/|play\.html#(?:deadzone|space-shooter)$)/i.test(project.url)){
        const link=addText(info,'a',project.linkText||(project.group==='games'?'Play on Sitelume ↗':'Visit website ↗'));
        link.href=project.url;link.target='_blank';link.rel='noopener noreferrer';
        link.setAttribute('aria-label','Visit '+project.title+' (opens in a new tab)');
      }
    });
    if(!matching.length){
      const empty=addText(cards,'div','','project-category-empty');
      addText(empty,'p',group.empty);
      const link=addText(empty,'a',group.key==='webapps'?'See a web app concept ↗':'Discuss a project ↗');
      link.href=group.key==='webapps'?'#work':'#contact';
    }
    realProjectGrid.appendChild(section);
  });
}
portfolioEmpty.hidden=validProjects.length>0;

const contactForm=document.getElementById('contactForm');
const message=document.getElementById('message');
const formNote=document.getElementById('formNote');
let selectedProject='';
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{
  selectedProject=button.dataset.project;
  const type=selectedProject.includes('web app')?'Web app':selectedProject.includes('game')?'Game':selectedProject.includes('software')?'Software':'Website';
  document.getElementById('projectType').value=type;
  document.getElementById('contact').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});
  formNote.textContent='Inspired by '+selectedProject+'. Tell me about your own idea before preparing the email.';
}));
contactForm.addEventListener('submit',event=>{
  event.preventDefault();
  if(!contactForm.reportValidity())return;
  const name=contactForm.elements.name.value.trim();
  const email=contactForm.elements.email.value.trim();
  const type=contactForm.elements.projectType.value;
  const details=message.value.trim();
  const subject=encodeURIComponent('Sitelume project enquiry from '+name);
  const inspiration=selectedProject?'\nInspired by: '+selectedProject:'';
  const body=encodeURIComponent('Name: '+name+'\nEmail: '+email+'\nProject type: '+type+inspiration+'\n\nProject details:\n'+details);
  formNote.textContent='Your email app is opening. Please send the prepared message there.';
  location.href='mailto:sadunildisanayaka@gmail.com?subject='+subject+'&body='+body;
});
document.getElementById('year').textContent=new Date().getFullYear();

