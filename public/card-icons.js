const LOGOS={
  'jreast.co.jp':{
    cls:'mark-jr',
    src:'https://upload.wikimedia.org/wikipedia/commons/3/30/JR_East_logo.svg',
    fallback:'https://commons.wikimedia.org/wiki/Special:Redirect/file/JR_East_logo.svg',
    alt:'JR東日本'
  },
  'tokyometro.jp':{cls:'mark-metro',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tokyo_Metro_logo.svg',alt:'東京メトロ'},
  'keisei.co.jp':{cls:'mark-keisei',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Keisei_Electric_Railway_logo.svg',alt:'京成電鉄'},
  'kotsu.metro.tokyo.jp':{cls:'mark-toei',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toei_Transportation_combined_logo.svg',alt:'都営交通'}
};

const ICONS={
  // E1: Google Material Symbols / bolt. Sources and licenses: /icon-credits.html
  'teideninfo.tepco.co.jp':{cls:'mark-electric',label:'電気',svg:`<svg aria-hidden="true" focusable="false" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m320-80 40-280H160l360-520h80l-40 320h240L400-80h-80Z"/></svg>`},
  // G5: Tabler Icons / flame (filled). Sources and licenses: /icon-credits.html
  'fmap.tokyo-gas.co.jp':{cls:'mark-gas',label:'ガス',svg:`<svg aria-hidden="true" focusable="false"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="currentColor"
>
  <path d="M10 2c0 -.88 1.056 -1.331 1.692 -.722c1.958 1.876 3.096 5.995 1.75 9.12l-.08 .174l.012 .003c.625 .133 1.203 -.43 2.303 -2.173l.14 -.224a1 1 0 0 1 1.582 -.153c1.334 1.435 2.601 4.377 2.601 6.27c0 4.265 -3.591 7.705 -8 7.705s-8 -3.44 -8 -7.706c0 -2.252 1.022 -4.716 2.632 -6.301l.605 -.589c.241 -.236 .434 -.43 .618 -.624c1.43 -1.512 2.145 -2.924 2.145 -4.78" />
</svg>`},
  // W2: Font Awesome Free / faucet-drip. Sources and licenses: /icon-credits.html
  'waterworks.metro.tokyo.lg.jp':{cls:'mark-water',label:'水道',svg:`<svg aria-hidden="true" focusable="false" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 544"><!--! Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026 Fonticons, Inc. --><path fill="currentColor" d="M224 32c-17.7 0-32 14.3-32 32L96 64C78.3 64 64 78.3 64 96s14.3 32 32 32l96 0 0 64-18.7 0c-8.5 0-16.6 3.4-22.6 9.4L128 224 32 224c-17.7 0-32 14.3-32 32l0 64c0 17.7 14.3 32 32 32l100.1 0c20.2 29 53.9 48 91.9 48s71.7-19 91.9-48l36.1 0c17.7 0 32 14.3 32 32s14.3 32 32 32l64 0c17.7 0 32-14.3 32-32 0-88.4-71.6-160-160-160l-32 0-22.6-22.6c-6-6-14.1-9.4-22.6-9.4l-18.7 0 0-64 96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0c0-17.7-14.3-32-32-32zM436.8 455.4l-18.2 42.4c-1.8 4.1-2.7 8.6-2.7 13.1l0 1.2c0 17.7 14.3 32 32 32s32-14.3 32-32l0-1.2c0-4.5-.9-8.9-2.7-13.1l-18.2-42.4c-1.9-4.5-6.3-7.4-11.2-7.4s-9.2 2.9-11.2 7.4z"/></svg>`},
  // S2: Material Design Icons / pipe. Sources and licenses: /icon-credits.html
  'gesui.metro.tokyo.lg.jp':{cls:'mark-sewer',label:'下水道',svg:`<svg aria-hidden="true" focusable="false" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22,14H20V16H14V13H16V11H14V6A2,2 0 0,0 12,4H4V2H2V10H4V8H10V11H8V13H10V18A2,2 0 0,0 12,20H20V22H22" /></svg>`}
};

function hostOf(link){try{return new URL(link.href).hostname.replace(/^www\./,'')}catch{return''}}
function configForHost(table,host){
  for(const [domain,cfg] of Object.entries(table)){
    if(host===domain||host.endsWith(`.${domain}`))return cfg;
  }
  return null;
}
function addBrandMark(link,cfg){
  link.classList.add('icon-link-card',cfg.cls);
  const mark=document.createElement('span');mark.className='card-mark brand-mark';mark.setAttribute('aria-hidden','true');
  const img=document.createElement('img');img.src=cfg.src;img.alt='';img.loading='lazy';img.decoding='async';
  if(cfg.fallback){
    img.addEventListener('error',()=>{
      if(img.dataset.fallbackTried)return;
      img.dataset.fallbackTried='1';
      img.src=cfg.fallback;
    });
  }
  mark.append(img);link.prepend(mark);
}
function addUtilityMark(link,cfg){
  link.classList.add('icon-link-card',cfg.cls);
  const mark=document.createElement('span');mark.className='card-mark utility-mark';mark.setAttribute('aria-hidden','true');mark.innerHTML=cfg.svg;link.prepend(mark);
}

for(const link of document.querySelectorAll('.link-grid.four a')){
  const host=hostOf(link);
  const logo=configForHost(LOGOS,host);
  const icon=configForHost(ICONS,host);
  if(logo)addBrandMark(link,logo);
  else if(icon)addUtilityMark(link,icon);
}
