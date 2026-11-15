(() => {
  'use strict';
  const games = {
    deadzone: {title:'Deadzone: Wave Survival',type:'ZOMBIE SURVIVAL',controls:'Desktop: WASD move, mouse aim, left click fire, Shift sprint. Mobile: use the two touch sticks.',src:'games/deadzone/'},
    'space-shooter': {title:'Space Shooter',type:'ARCADE SHOOTER',controls:'Desktop: WASD or arrows move, Space fires, P pauses. Mobile: drag to move and fire.',src:'games/space-shooter/'}
  };
  const buttons=[...document.querySelectorAll('[data-game]')];
  const screen=document.getElementById('gameScreen');
  const title=document.getElementById('gameTitle');
  const type=document.getElementById('gameType');
  const controls=document.getElementById('gameControls');
  const fullscreen=document.getElementById('fullscreenGame');
  const open=document.getElementById('openGame');
  function selectGame(key){
    const game=games[key];
    if(!game)return;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.game===key)));
    title.textContent=game.title;
    type.textContent=game.type;
    controls.textContent=game.controls;
    const frame=document.createElement('iframe');
    frame.src=game.src;
    frame.title='Play '+game.title;
    frame.allow='autoplay; fullscreen';
    frame.loading='eager';
    screen.replaceChildren(frame);
    open.href=game.src;
    open.hidden=false;
    fullscreen.disabled=false;
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.game;
    if(location.hash.slice(1)!==key)location.hash=key;
    else selectGame(key);
    document.getElementById('gameStage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }));
  window.addEventListener('hashchange',()=>selectGame(location.hash.slice(1)));
  fullscreen.addEventListener('click',()=>{
    if(screen.requestFullscreen)screen.requestFullscreen().catch(()=>{});
  });
  document.getElementById('playYear').textContent=new Date().getFullYear();
  selectGame(location.hash.slice(1));
})();
