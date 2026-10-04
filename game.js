const app = document.querySelector('#app');
const names = {face:'ふくわらい',color:'ぬりえ',puzzle:'パズル',claw:'クレーンゲーム',shoot:'しゃてき',pinball:'パチンコ'};
const family = ['おじさん','おばあさん','おとうさん','おかあさん','おとこのこ','おんなのこ'];
const steps = ['みぎみみ','ひだりみみ','ひだりまゆげ','みぎまゆげ','みぎめ','ひだりめ','はな','くち'];
const themes = ['うみの プリンセス','こうえんの いぬ','おみせの くるま','おへやの おにんぎょう','うちゅうの ロボット','わのおしろの ヒーロー','おしろの プリンセス','まちの しょうぼうしゃ','いなかの うさぎ','うみの くま','こうえんの ヒーロー','おはなやの ねこ','おへやの ロボット','つきの ロケット','にわの きしゃ','ぶとうかいの おにんぎょう','まちの どうぶつバス','ぼくじょうの ポニー'];
const puzzleThemes = [...themes];
const base = ['#ed5c69','#f3984b','#f9d55d','#80bd61','#38ab8d','#63c8de','#468ad6','#8164b6','#d77dc1','#855b42','#ffffff','#333344'];
const colorNames = ['あか','オレンジ','きいろ','きみどり','みどり','みずいろ','あお','むらさき','ピンク','ちゃいろ','しろ','くろ'];
let cleanup = () => {}, roomScroll = null, current = 'home', lifecycle = 0;
app.addEventListener('touchmove',e=>{if(current==='color'&&e.touches.length>1)e.preventDefault();},{passive:false});
app.addEventListener('gesturestart',e=>{if(current==='color')e.preventDefault();},{passive:false});
app.addEventListener('gesturechange',e=>{if(current==='color')e.preventDefault();},{passive:false});
const assets = {}, sprites = {}, rand = (a,b) => a + Math.random()*(b-a);
const gripRadii = [.115,.095,.115,.108,.095,.085,.11,.11];
function gripResult(item,x,z) {
  const distance = Math.hypot(item.x-x,item.z-z), radius = gripRadii[item.toy%8]*(item.size||1)*(item.buried?.72:1);
  return distance > radius ? 'miss' : distance > radius*.85 ? 'slip' : 'hold';
}
function portraitLayout(){return !!window.matchMedia?.('(orientation: portrait)').matches;}
function resetActivity(key) { cleanup(); cleanup=()=>{}; current=key; return ++lifecycle; }
function header(title) {return `<header><div class="brand">${title}</div><button class="round home-button" onclick="home()" aria-label="ホームへもどる"><span class="home-symbol" aria-hidden="true"></span></button></header>`;}
function shell(key,text) {
  resetActivity(key);
  app.innerHTML = header(names[key])+`<section class="screen game-${key}"><p class="instruction" aria-live="polite">${text}</p><div class="play" id="play"></div><div class="toolbar" id="toolbar"></div></section>`;
  return document.querySelector('#play');
}
function modal(text,fn) {
  const el=document.createElement('div'); el.className='overlay'; el.setAttribute('role','dialog'); el.setAttribute('aria-label',text);
  el.innerHTML=`<div class="dialog"><h2>${text}</h2><button class="primary" aria-label="もういちど">↻</button><button class="round" onclick="home()" aria-label="ホームへもどる">⌂</button></div>`;
  el.querySelector('.primary').onclick=()=>{el.remove();fn();}; app.append(el);
}
function rounded(g,x,y,w,h,color,r=18) {g.fillStyle=color;g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else{r=Math.min(r,w/2,h/2);g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();}g.fill();}
function point(e,c) {const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
function makeCanvas(w=1000,h=480) {
  const c=document.createElement('canvas');c.width=w;c.height=h;c.setAttribute('aria-label',names[current]+'の あそぶ ばしょ');
  document.querySelector('#play').append(c);return [c,c.getContext('2d')];
}
function loop(fn) {let id,last=0;function frame(t){if(document.visibilityState!=='hidden'&&t-last>=1000/30){last=t;fn(t);}id=requestAnimationFrame(frame);}id=requestAnimationFrame(frame);cleanup=()=>cancelAnimationFrame(id);}
function crop(img,x,y,w,h,trim=false) {
  const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);const g=c.getContext('2d');g.drawImage(img,x,y,w,h,0,0,c.width,c.height);
  if(!trim)return c;
  const data=g.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;
  for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++)if(data[(yy*c.width+xx)*4+3]>80){l=Math.min(l,xx);t=Math.min(t,yy);r=Math.max(r,xx);b=Math.max(b,yy);}
  return r>l&&b>t?crop(c,l,t,r-l+1,b-t+1):c;
}
function drawContained(g,img,x,y,w,h) {const scale=Math.min(w/img.width,h/img.height);g.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale);}
function photoThumb(source,w=140,h=100) {const c=document.createElement('canvas');c.width=w;c.height=h;drawContained(c.getContext('2d'),source,0,0,w,h);c.className='photo-thumb';return c;}
function photoCard(source,label,fn) {const b=document.createElement('button');b.className='card';b.setAttribute('aria-label',label);b.append(photoThumb(source));const s=document.createElement('span');s.textContent=label;b.append(s);b.onclick=fn;return b;}
function choose(key,text,labels,pictures,fn) {const p=shell(key,text);p.className='choices';labels.forEach((label,i)=>p.append(photoCard(pictures[i],label,()=>fn(i))));}
function atlas(img,cols,rows,trim=false) {return Array.from({length:cols*rows},(_,i)=>crop(img,(i%cols)*img.width/cols,Math.floor(i/cols)*img.height/rows,img.width/cols,img.height/rows,trim));}
function drawPrize(g,item,x,y,w,h) {g.save();g.translate(x+w/2,y+h/2);g.rotate(item.angle||0);drawContained(g,sprites.prizes[item.toy],-w/2,-h/2,w,h);g.restore();}
function themeChoose(key,text,pictures,fn){choose(key,text,themes,pictures,fn);const grid=document.querySelector('#play');grid.classList.add('theme-grid');grid.querySelectorAll('canvas').forEach((c,i)=>{c.width=pictures[i].width;c.height=pictures[i].height;c.getContext('2d').drawImage(pictures[i],0,0);});}
const facePositions=[[326,255],[154,255],[209,201],[271,201],[209,226],[271,226],[240,263],[240,302]];
function buildSprites() {
  if(assets.toys&&!sprites.toys){
  sprites.toys=Array.from({length:12},(_,i)=>crop(assets.toys,(i%4)*assets.toys.width/4,Math.floor(i/4)*assets.toys.height/3,assets.toys.width/4,assets.toys.height/3,true));
  sprites.toys[8]=crop(assets.toys,25,770,399,295,true);
  sprites.toys[9]=crop(assets.toys,440,730,325,345,true);
  sprites.toys[10]=crop(assets.toys,775,800,370,275,true);
  sprites.toys[11]=crop(assets.toys,1160,780,275,282,true);
  }
  if(assets.difficulty&&!sprites.difficulty){
  sprites.difficulty=Array.from({length:4},(_,i)=>crop(assets.difficulty,i*assets.difficulty.width/4,0,assets.difficulty.width/4,assets.difficulty.height,true));
  }
  if(assets.stages&&!sprites.stages){
  sprites.stages=Array.from({length:4},(_,i)=>crop(assets.stages,(i%2)*assets.stages.width/2,Math.floor(i/2)*assets.stages.height/2,assets.stages.width/2,assets.stages.height/2));
  sprites.stages[2]=crop(sprites.stages[2],170,0,560,sprites.stages[2].height);
  }
  if(assets.color18&&!sprites.coloring){
  sprites.coloring=atlas(assets.color18,6,3);
  }
  if(assets.puzzle18&&!sprites.puzzles){
  sprites.puzzles=atlas(assets.puzzle18,6,3);
  }
  if(assets.prizes&&!sprites.prizes){
  const prizeRects=[[0,0,293,292],[293,70,295,220],[588,0,268,292],[856,0,270,292],[1126,0,245,292],[1371,0,300,292],[1671,0,244,292],[0,292,307,265],[307,292,249,265],[556,292,245,265],[801,292,328,265],[1129,292,273,265],[1402,292,273,265],[1675,292,240,265],[0,557,246,264],[246,557,332,264],[578,557,310,264],[888,557,285,264],[1173,557,223,264],[1396,557,278,264],[1674,557,241,264]];
  sprites.prizes=prizeRects.map(([x,y,w,h])=>crop(assets.prizes,x,y,w,h,true));
  }
  if(assets.faces&&!sprites.faces){
  const faceRows=[[35,265],[302,160],[474,164],[663,86],[777,86],[877,112],[1013,119],[1141,156],[1331,135]];
  sprites.faces=Array.from({length:9},(_,row)=>Array.from({length:6},(_,col)=>crop(assets.faces,col*assets.faces.width/6+3,faceRows[row][0],assets.faces.width/6-6,faceRows[row][1],true)));
  [sprites.faces[1],sprites.faces[2]]=[sprites.faces[2],sprites.faces[1]];
  sprites.portraits=family.map((_,i)=>{const c=document.createElement('canvas');c.width=480;c.height=480;const g=c.getContext('2d');drawFaceBase(g,i);facePositions.forEach(([x,y],part)=>drawFeature(g,part,i,x,y));return c;});
  }
}
function home() {
  resetActivity('home');
  app.innerHTML=`<header><div class="round room-note">すきな おもちゃを さわってね</div></header><div class="room"><div class="panorama"><button class="hotspot" style="left:12%;top:54%" onclick="start('shoot')">しゃてき</button><button class="hotspot" style="left:41%;top:55%" onclick="start('color')">ぬりえ</button><button class="hotspot" style="left:54%;top:55%" onclick="start('face')">ふくわらい</button><button class="hotspot" style="left:63%;top:79%" onclick="start('puzzle')">パズル</button><button class="hotspot" style="left:93%;top:65%" onclick="start('pinball')">パチンコ</button><button class="hotspot" style="left:77%;top:53%" onclick="start('claw')">クレーンゲーム</button></div></div><div class="hint">よこに なでて おへやを みよう <span class="dots">●●●</span></div>`;
  const r=app.querySelector('.room');r.scrollLeft=roomScroll??(r.scrollWidth-r.clientWidth)/2;
  let sx,sl,drag=false,panActive=false; r.onpointerdown=e=>{sx=e.clientX;sl=r.scrollLeft;drag=false;panActive=!e.target.closest('button');};
  r.onpointermove=e=>{if(panActive&&e.buttons&&e.pointerType==='mouse'){drag ||= Math.abs(e.clientX-sx)>12;if(drag)r.scrollLeft=sl+sx-e.clientX;}};
  r.onpointerup=r.onpointercancel=()=>panActive=false;
  r.addEventListener('click',e=>{if(drag){e.preventDefault();e.stopPropagation();}},true);r.onscroll=()=>roomScroll=r.scrollLeft;
}
async function start(k) {
  const session=resetActivity('loading');app.innerHTML=header(names[k])+'<div class="loading">おもちゃを じゅんびしています…</div>';
  const needed={face:['faces','stages'],color:['color18'],puzzle:['puzzle18','difficulty','stages'],claw:['prizes','toys','stages'],shoot:['prizes','toys','stages'],pinball:['cabinet','puzzle18','prizes']}[k];
  try{await Promise.all(needed.map(loadImage));if(session!==lifecycle)return;buildSprites();({face:faceMenu,color:colorMenu,puzzle:puzzleMenu,claw,shoot:shootMenu,pinball})[k]();}
  catch{if(session===lifecycle)app.innerHTML=header(names[k])+'<div class="loading">よみこめませんでした。おへやから もういちど あそんでね</div>';}
}
function drawFaceBase(g,type) {
  g.save();g.beginPath();g.moveTo(145,59);g.lineTo(335,59);g.quadraticCurveTo(348,133,331,201);g.lineTo(319,228);g.lineTo(321,275);g.quadraticCurveTo(310,357,240,377);g.quadraticCurveTo(170,357,159,275);g.lineTo(161,228);g.lineTo(149,201);g.quadraticCurveTo(132,133,145,59);g.closePath();g.clip();
  g.drawImage(sprites.faces[0][type],134,59,212,318);g.restore();
}
function featureSize(part) {return part<2?[30,54]:part<4?[46,18]:part<6?[45,29]:part===6?[38,54]:[65,39];}
function drawFeature(g,part,type,x,y,rotation=0,scale=1) {const [w,h]=featureSize(part);g.save();g.translate(x,y);g.rotate(rotation);g.scale(1,scale);g.beginPath();g.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);g.clip();drawContained(g,sprites.faces[part+1][type],-w/2,-h/2,w,h);g.restore();}
function faceMenu() {choose('face','どの おかおで あそぶ？',family,sprites.portraits,face);document.querySelector('#play').classList.add('family-grid');}
function randomFaceTarget(){return {x:rand(145,335),y:rand(180,325)};}
function face(type) {
  const p=shell('face','みぎみみの パーツを えらんでね');const session=lifecycle;p.classList.add('face-play');
  const [c,g]=makeCanvas(480,portraitLayout()?660:480);const panel=document.createElement('div');panel.className='face-panel';p.append(panel);
  let placed=[],selected=null,target={x:240,y:240},next=0,timer;
  document.querySelector('#toolbar').innerHTML='<span class="progress" id="count">0 / 8</span><span id="face-next">みぎみみを えらぼう</span>';
  function renderChoices() {
    panel.innerHTML='';const title=document.createElement('h2');title.textContent=steps[placed.length]+'を えらぼう';panel.append(title);
    const choices=document.createElement('div');choices.className='feature-choices';panel.append(choices);
    family.forEach((label,person)=>{const b=photoCard(sprites.faces[placed.length+1][person],label,()=>{selected=person;target=randomFaceTarget();choices.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.querySelector('.instruction').textContent='うごく しるしを みて、おかおを タップ！';});b.setAttribute('aria-label',label+'の '+steps[placed.length]);choices.append(b);});
    document.querySelector('#face-next').textContent=steps[placed.length]+'を えらぼう';document.querySelector('.instruction').textContent=steps[placed.length]+'の パーツを えらんでね';
  }
  const placePart=()=>{
    if(selected===null||placed.length===8)return;placed.push({part:placed.length,person:selected,...target});selected=null;
    document.querySelector('#count').textContent=`${placed.length} / 8`;
    if(placed.length===8){panel.innerHTML='<div class="finished-face">できた！<br>おかおが うごくよ</div>';document.querySelector('#face-next').textContent='８こ そろった！';timer=setTimeout(()=>{if(lifecycle===session)modal('できた！ おもしろい おかお',faceMenu);},2300);}else renderChoices();
  };
  document.querySelector('.game-face').onclick=e=>{if(e.target.closest('button,header'))return;placePart();};
  renderChoices();loop(t=>{
    g.clearRect(0,0,c.width,c.height);g.drawImage(sprites.stages[3],0,0,c.width,c.height);g.save();if(portraitLayout())g.setTransform(1.5,0,0,1.5,-120,0);rounded(g,58,20,364,435,'#fffdf5',16);drawFaceBase(g,type);
    if(selected!==null&&t>next){target=randomFaceTarget();next=t+140;}
    placed.forEach(v=>{const animate=placed.length===8&&(v.part===2||v.part===3||v.part===7);drawFeature(g,v.part,v.person,v.x,v.y,animate?Math.sin(t/230+v.part)*.1:0,v.part===7&&placed.length===8?1+Math.sin(t/170)*.18:1);});
    if(selected!==null){g.strokeStyle='#d2578a';g.lineWidth=4;g.setLineDash([6,5]);g.beginPath();g.arc(target.x,target.y,27,0,Math.PI*2);g.stroke();g.setLineDash([]);g.globalAlpha=.5;drawFeature(g,placed.length,selected,target.x,target.y);g.globalAlpha=1;}
    g.restore();
  });const cancelLoop=cleanup;cleanup=()=>{cancelLoop();clearTimeout(timer);};
}
function colorMenu() {themeChoose('color','どの えを ぬろう？',sprites.coloring,color);}
function closedLineRegions(pixels,w,h) {
  const n=w*h,line=new Uint8Array(n),expanded=new Uint8Array(n),barrier=new Uint8Array(n),labels=new Int32Array(n).fill(-1),queue=new Int32Array(n),sizes=[];
  // Only dark contour pixels are barriers. Interior colors never affect region membership.
  for(let i=0;i<n;i++){const j=i*4;line[i]=pixels[j+3]>128&&(pixels[j]*.299+pixels[j+1]*.587+pixels[j+2]*.114)<200?1:0;}
  // Close one-pixel interruptions in outlines, then display the same repaired barriers.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let found=0;for(let dy=-1;dy<=1&&!found;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&line[yy*w+xx]){found=1;break;}}expanded[i]=found;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let filled=1;for(let dy=-1;dy<=1&&filled;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!expanded[yy*w+xx]){filled=0;break;}}barrier[i]=line[i]||filled;}
  for(let seed=0;seed<n;seed++)if(!barrier[seed]&&labels[seed]===-1){
    const id=sizes.length;let head=0,tail=1,touchesEdge=false;queue[0]=seed;labels[seed]=id;
    while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x===0||x===w-1||y===0||y===h-1)touchesEdge=true;
      for(const q of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(q>=0&&!barrier[q]&&labels[q]===-1){labels[q]=id;queue[tail++]=q;}
    }
    if(touchesEdge){for(let k=0;k<tail;k++)labels[queue[k]]=-2;}else sizes.push(tail);
  }
  return {labels,barrier,sizes,width:w,height:h};
}
function closedRegionAt(data,x,y) {
  if(x<0||y<0||x>=data.width||y>=data.height)return null;
  const id=data.labels[Math.floor(y)*data.width+Math.floor(x)];return id>=0?id:null;
}
function buildColorRegions(img,w,h){
  const source=document.createElement('canvas');source.width=w;source.height=h;const g=source.getContext('2d');g.drawImage(img,0,0,w,h);
  return closedLineRegions(g.getImageData(0,0,w,h).data,w,h);
}

function mixPigment(existing,incoming){if(!existing)return incoming;const a=[1,3,5].map(n=>parseInt(existing.slice(n,n+2),16)),b=[1,3,5].map(n=>parseInt(incoming.slice(n,n+2),16));return '#'+a.map((v,i)=>Math.round((v+b[i])/2).toString(16).padStart(2,'0')).join('');}
function colorZoomPose(scale,x,y,width,height){scale=Math.max(1,Math.min(4,scale));const limitX=width*(scale-1)/2,limitY=height*(scale-1)/2;return {scale,x:Math.max(-limitX,Math.min(limitX,x)),y:Math.max(-limitY,Math.min(limitY,y))};}
function enableColorZoom(canvas,tap,onZoom=()=>{}){
  canvas.style.touchAction='none';canvas.style.transformOrigin='center';canvas.classList.add('zoom-color');const pointers=new Map();let pose={scale:1,x:0,y:0},gesture=null,moved=false,multi=false;
  function update(){pose=colorZoomPose(pose.scale,pose.x,pose.y,canvas.clientWidth,canvas.clientHeight);canvas.style.transform='translate('+pose.x+'px,'+pose.y+'px) scale('+pose.scale+')';onZoom(pose.scale);}
  function pair(){const p=[...pointers.values()];return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};}
  function begin(){if(pointers.size>=2){const mid=pair(),r=canvas.getBoundingClientRect();gesture={...mid,xMid:mid.x,yMid:mid.y,scale:pose.scale,cx:r.left+r.width/2-pose.x,cy:r.top+r.height/2-pose.y,x:pose.x,y:pose.y};multi=true;moved=true;}else if(pointers.size){const p=[...pointers.values()][0];gesture={...p,x:pose.x,y:pose.y,startX:p.x,startY:p.y};}}
  canvas.onpointerdown=e=>{e.preventDefault();if(!pointers.size){moved=false;multi=false;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);begin();};
  canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){const mid=pair(),scale=Math.max(1,Math.min(4,gesture.scale*mid.d/Math.max(1,gesture.d)));pose={scale,x:0,y:0};pose.x=mid.x-gesture.cx-(gesture.xMid-gesture.cx-gesture.x)*scale/gesture.scale;
      pose.y=mid.y-gesture.cy-(gesture.yMid-gesture.cy-gesture.y)*scale/gesture.scale;update();
    }else{const p=[...pointers.values()][0];if(Math.hypot(p.x-gesture.startX,p.y-gesture.startY)>7)moved=true;if(pose.scale>1){pose.x=gesture.x+p.x-gesture.startX;pose.y=gesture.y+p.y-gesture.startY;update();}}};

  canvas.onpointerup=e=>{if(!pointers.has(e.pointerId))return;const shouldPaint=pointers.size===1&&!moved&&!multi;pointers.delete(e.pointerId);if(shouldPaint)tap(e);begin();};
  canvas.onpointercancel=e=>{pointers.delete(e.pointerId);moved=true;begin();};canvas.onlostpointercapture=e=>{if(pointers.has(e.pointerId)){pointers.delete(e.pointerId);moved=true;begin();}};
}
function color(type) {
  shell('color','いろを えらんで、ぬりたい ところを タップ');const w=480,h=640,[c,g]=makeCanvas(w,h);const data=buildColorRegions(sprites.coloring[type],w,h);
  const output=g.createImageData(w,h),fills=new Map();let selected=base[0],washing=false,mixes=Array(6).fill(null);const toolbar=document.querySelector('#toolbar');document.querySelector('.game-color').classList.add('color-studio');
  const water=document.createElement('button');water.className='water-bowl';water.innerHTML='<svg viewBox="0 0 100 130" aria-hidden="true"><defs><linearGradient id="jar-glass" x2="1" y2="0"><stop stop-color="#e8faff" stop-opacity=".9"/><stop offset=".5" stop-color="#8ad4ea" stop-opacity=".5"/><stop offset="1" stop-color="#3e8dab" stop-opacity=".8"/></linearGradient></defs><path d="M30 14 H70 V30 Q87 41 87 56 V109 Q87 122 73 122 H27 Q13 122 13 109 V56 Q13 41 30 30Z" fill="url(#jar-glass)" stroke="#5995ac" stroke-width="4"/><path d="M17 69 Q50 78 83 69 V107 Q83 117 72 117 H28 Q17 117 17 107Z" fill="#51b5dc" opacity=".7"/><ellipse cx="50" cy="69" rx="33" ry="8" fill="#a5e7fb"/><rect x="25" y="8" width="50" height="13" rx="5" fill="#d0e6ee" stroke="#5995ac" stroke-width="3"/><path d="M26 47 V101" stroke="white" opacity=".65" stroke-width="6" stroke-linecap="round"/><circle cx="63" cy="94" r="5" fill="#d5f8ff"/></svg>';water.setAttribute('aria-label','水で色を消す');water.onclick=()=>{washing=true;palette();};document.querySelector('#play').append(water);
  toolbar.onclick=e=>{if(e.target.closest('button'))return;selected=null;washing=false;palette();};
  function palette() {
    water.classList.toggle('selected',washing);toolbar.innerHTML='<div class="palette" id="bases"></div><div class="palette" id="mixes"></div>';
    base.forEach((col,i)=>{const b=document.createElement('button');b.className='swatch'+(!washing&&col===selected?' selected':'');b.style.background=col;b.setAttribute('aria-label',colorNames[i]);b.onclick=()=>{selected=col;washing=false;palette();};toolbar.querySelector('#bases').append(b);});
    mixes.forEach((col,i)=>{const b=document.createElement('button');b.className='mix'+(!washing&&col&&col===selected?' selected':'');b.style.background=col||'#fff';b.textContent=col?'':'＋';b.setAttribute('aria-label','まぜるパレット '+(i+1));b.onclick=()=>{if(washing){mixes[i]=null;}else if(selected!==null){mixes[i]=mixPigment(col,selected);selected=mixes[i];}else if(col){selected=col;}palette();};toolbar.querySelector('#mixes').append(b);});
  }
  function draw() {
    for(let i=0;i<w*h;i++){const j=i*4,color=data.barrier[i]?[32,30,29]:fills.get(data.labels[i])||[255,255,255];
      output.data[j]=color[0];output.data[j+1]=color[1];output.data[j+2]=color[2];output.data[j+3]=255;
    }g.putImageData(output,0,0);
  }
  function paintAt(e){if(selected===null&&!washing)return;const p=point(e,c),id=closedRegionAt(data,p.x,p.y);if(id===null)return;
    if(washing)fills.delete(id);else fills.set(id,[1,3,5].map(n=>parseInt(selected.slice(n,n+2),16)));draw();
  }
  const art=document.createElement('div');art.className='color-art';const area=document.createElement('div');area.className='color-art-area';const window=document.createElement('div');window.className='color-zoom-window';c.parentNode.insertBefore(art,c);window.append(c);area.append(window);art.append(area);
  const indicator=document.createElement('div');indicator.className='zoom-indicator';indicator.innerHTML='<span aria-hidden="true">⌕</span><meter min="1" max="4" value="1" aria-label="絵の拡大倍率"></meter><output>1.0×</output>';art.append(indicator);
  enableColorZoom(c,paintAt,scale=>{indicator.querySelector('meter').value=scale;indicator.querySelector('output').textContent=scale.toFixed(1)+'×';});palette();draw();

}
function puzzleMenu() {themeChoose('puzzle','どの パズルで あそぶ？',sprites.puzzles,t=>choose('puzzle','どの こで あそぶ？',['あかちゃん','えんじ','ねんちょうさん','ランドセルのこ'],sprites.difficulty,d=>puzzle(t,d)));}
function piecePath(g,w,h,col,row,cols,rows) {
  const k=Math.min(w,h)*.18;g.beginPath();g.moveTo(0,0);
  function edge(x1,y1,x2,y2,bulge){const dx=x2-x1,dy=y2-y1;g.lineTo(x1+dx*.35,y1+dy*.35);if(bulge){const nx=-dy/Math.hypot(dx,dy)*k*bulge,ny=dx/Math.hypot(dx,dy)*k*bulge;g.bezierCurveTo(x1+dx*.3+nx,y1+dy*.3+ny,x1+dx*.7+nx,y1+dy*.7+ny,x1+dx*.65,y1+dy*.65);}g.lineTo(x2,y2);}
  edge(0,0,w,0,row?1:0);edge(w,0,w,h,col<cols-1?-1:0);edge(w,h,0,h,row<rows-1?-1:0);edge(0,h,0,0,col?1:0);g.closePath();
}
function drawPiece(g,art,p,cols,rows,pw,ph,w,h) {
  g.save();g.translate(p.x,p.y);piecePath(g,pw,ph,p.i%cols,Math.floor(p.i/cols),cols,rows);g.save();g.clip();g.drawImage(art,-(p.i%cols)*pw,-Math.floor(p.i/cols)*ph);g.restore();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();g.restore();
}
function puzzleSlots(cols,rows,pw,ph){
  const slots=[],perSide=cols*rows/2,across=Math.max(1,Math.floor(304/(pw+12))),down=Math.ceil(perSide/across),gapY=Math.min(12,(456-down*ph)/Math.max(1,down-1));
  for(let side=0;side<2;side++)for(let i=0;i<perSide;i++){const col=i%across,row=Math.floor(i/across);slots.push({x:(side?684:22)+col*(pw+12),y:22+row*(ph+gapY)});}
  for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}return slots;
}
function portraitPuzzleSlots(cols,rows,pw,ph){const slots=[],gap=2,zones=[{x:3,y:5,w:470,h:245},{x:5,y:260,w:102,h:480},{x:3,y:750,w:470,h:165}];for(const z of zones){const nx=Math.floor((z.w+gap)/(pw+gap)),ny=Math.floor((z.h+gap)/(ph+gap));for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)slots.push({x:z.x+x*(pw+gap),y:z.y+y*(ph+gap)});}if(slots.length<cols*rows)throw new Error('Puzzle tray too small');return slots.slice(0,cols*rows);}
function puzzle(t,d) {
  shell('puzzle','ピースを もって、ぴったりの ばしょへ');const [c,g]=makeCanvas(portraitLayout()?480:1000,portraitLayout()?930:500),cols=[4,6,6,8][d],rows=[3,4,6,6][d],bw=portraitLayout()?360:300,bh=portraitLayout()?480:400,bx=portraitLayout()?112:350,by=portraitLayout()?260:50,pw=bw/cols,ph=bh/rows;
  const art=document.createElement('canvas');art.width=bw;art.height=bh;art.getContext('2d').drawImage(sprites.puzzles[t],0,0,bw,bh);
  const slots=portraitLayout()?portraitPuzzleSlots(cols,rows,pw,ph):puzzleSlots(cols,rows,pw,ph);
  if(portraitLayout())for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  const pieces=Array.from({length:cols*rows},(_,i)=>({i,x:slots[i].x,y:slots[i].y,ox:slots[i].x,oy:slots[i].y,done:false}));let drag=null,off={},count=0;
  document.querySelector('#toolbar').innerHTML=`<span class="progress" id="pcount">0 / ${pieces.length}</span>`;
  const mini=document.createElement('button');mini.className='mini';mini.append(photoThumb(sprites.puzzles[t],75,52));mini.setAttribute('aria-label','おてほんを おおきくする');
  mini.onclick=()=>{const o=document.createElement('div');o.className='overlay';o.setAttribute('aria-label','おてほん。まわりをタップすると とじる');const im=document.createElement('img');im.src=art.toDataURL();im.alt=puzzleThemes[t]+'の おてほん';im.style.cssText='width:60%;max-height:80%;object-fit:contain;border:8px solid white;border-radius:24px';o.append(im);o.onclick=e=>{if(e.target===o)o.remove();};app.append(o);};if(portraitLayout()){mini.classList.add('portrait-reference');document.querySelector('#toolbar').prepend(mini);}else document.querySelector('#play').append(mini);
  const dims=()=>({w:pw,h:ph});
  function draw(){g.clearRect(0,0,c.width,c.height);g.drawImage(sprites.stages[3],0,0,c.width,c.height);rounded(g,bx-8,by-8,bw+16,bh+16,'#d0bda4',10);g.globalAlpha=.15;g.drawImage(art,bx,by);g.globalAlpha=1;pieces.filter(p=>p!==drag).forEach(p=>{const z=dims(p);drawPiece(g,art,p,cols,rows,pw,ph,z.w,z.h);});if(drag)drawPiece(g,art,drag,cols,rows,pw,ph,pw,ph);}
  c.onpointerdown=e=>{const q=point(e,c);drag=[...pieces].reverse().find(p=>{const z=dims(p);return !p.done&&q.x>=p.x&&q.x<=p.x+z.w&&q.y>=p.y&&q.y<=p.y+z.h;});if(drag){off={x:q.x-drag.x,y:q.y-drag.y};c.setPointerCapture(e.pointerId);draw();}};
  c.onpointermove=e=>{if(drag){const q=point(e,c);drag.x=Math.max(0,Math.min(c.width-pw,q.x-off.x));drag.y=Math.max(0,Math.min(c.height-ph,q.y-off.y));draw();}};
  function release(cancelled=false){if(!drag)return;const x=bx+drag.i%cols*pw,y=by+Math.floor(drag.i/cols)*ph;if(!cancelled&&Math.hypot(drag.x-x,drag.y-y)<Math.max(30,pw*.5)){drag.x=x;drag.y=y;drag.done=true;count++;document.querySelector('#pcount').textContent=`${count} / ${pieces.length}`;}else{drag.x=drag.ox;drag.y=drag.oy;}drag=null;draw();if(count===pieces.length)modal('できた！ すてきな パズル',puzzleMenu);}
  c.onpointerup=()=>release();c.onpointercancel=()=>release(true);draw();
}
function clawGlass(view){if(portraitLayout())return view?{x:74,y:45,w:310,h:588}:{x:60,y:42,w:358,h:510};return view?{x:127,y:20,w:600,h:332}:{x:102,y:18,w:692,h:288};}
function clawOutlet(view){return portraitLayout()?{x:view?455:392,y:704}:{x:view?663:738,y:393};}
function clawX(view,position){const box=clawGlass(view);return box.x+56+position*(box.w-112);}
function clawPrizePose(item,view){const box=clawGlass(view),size=87*item.size,extent=size*(Math.abs(Math.cos(item.angle))+Math.abs(Math.sin(item.angle))),depth=view?item.x:item.z,cx=Math.max(box.x+extent/2+2,Math.min(box.x+box.w-extent/2-2,clawX(view,view?item.z:item.x)));return {x:cx-size/2,y:box.y+box.h-8-depth*18-(item.layer||0)*24-extent/2-size/2,size};}
function insideClaw(g,view,draw){const box=clawGlass(view);g.save();g.beginPath();g.rect(box.x,box.y,box.w,box.h);g.clip();draw();g.restore();}
function claw() {
  shell('claw','まえ・よこを みて まんなかに あわせよう');const [c,g]=makeCanvas(portraitLayout()?480:900,portraitLayout()?860:460);
  let x=.5,z=.5,view=0,busy=false,phase=0,held=null,grip='miss',assessed=false,won=[],direction=0,velocity=0,message='クレーンの「おろす」を タップ';
  const items=Array.from({length:36},(_,i)=>({x:Math.max(0,Math.min(1,(i%6)/5+rand(-.018,.018))),z:Math.max(0,Math.min(1,Math.floor(i/6)/5+rand(-.018,.018))),toy:i%21,size:rand(.85,1.25),angle:i%4===0?(i%2?1:-1)*Math.PI/2:rand(-.3,.3),layer:i%3===0?1:i%11===0?2:0,buried:i%5===0,taken:false}));
  document.querySelector('#toolbar').classList.add('claw-deck');document.querySelector('#toolbar').innerHTML='<button class="view-turn" id="view" aria-label="視点を切り替える">↶</button><button class="round-control" id="left" aria-label="ひだりへ">←</button><button class="round-control" id="drop" aria-label="クレーンを おろす">○</button><button class="round-control" id="right" aria-label="みぎへ">→</button><button class="view-turn" id="view-right" aria-label="視点を切り替える">↷</button><span class="progress" id="won" hidden></span>';
  const switchView=()=>{view=1-view;velocity=0;direction=0;};document.querySelector('#view').onclick=switchView;document.querySelector('#view-right').onclick=switchView;
  for(const [id,dir] of [['left',-1],['right',1]]){const b=document.querySelector('#'+id);b.onpointerdown=e=>{direction=dir;b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>direction=0;}
  function drop(){if(busy)return;busy=true;direction=0;velocity=0;phase=0;held=null;grip='miss';assessed=false;message='つかむよ…';}
  const dropButton=document.querySelector('#drop');dropButton.onclick=drop;
  let previous=0;
  loop(t=>{
    const dt=previous?Math.min((t-previous)/1000,.04):0;previous=t;
    if(!busy){velocity+=(direction*.32-velocity)*Math.min(1,dt*13);if(view)z=Math.max(.05,Math.min(.95,z+velocity*dt));else x=Math.max(.05,Math.min(.95,x+velocity*dt));}
    else{
      phase+=dt;
      if(phase>=1.15&&!assessed){assessed=true;const candidate=items.filter(i=>!i.taken).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];grip=candidate?gripResult(candidate,x,z):'miss';held=grip==='miss'?null:candidate;}
      if(phase>2.15&&grip==='slip'&&held){held=null;message='おちちゃった！ もうすこし まんなかへ';}
      if(phase>4.05){busy=false;if(held){held.taken=true;won.push(held.toy);document.querySelector('#won').textContent=`とれた！ ${won.length} こ`;message='とれた！';}else if(grip==='miss')message='まえと よこで ばしょを あわせてね';held=null;if(items.every(i=>i.taken))modal('ぜんぶ とれた！',claw);}
    }
    g.clearRect(0,0,c.width,c.height);g.drawImage(sprites.stages[view?2:1],0,0,c.width,c.height);
    insideClaw(g,view,()=>{const box=clawGlass(view),rowCount=portraitLayout()?5:3,left=box.x+13,shelfWidth=box.w-26,spacing=(box.h-22)/rowCount;g.fillStyle='#766656';g.fillRect(left,box.y+8,4,box.h-12);g.fillRect(left+shelfWidth-4,box.y+8,4,box.h-12);for(let row=0;row<rowCount;row++){const sy=box.y+14+(row+1)*spacing,columns=portraitLayout()?5:7;const shelf=g.createLinearGradient(0,sy,0,sy+9);shelf.addColorStop(0,'#faf1dc');shelf.addColorStop(.5,'#bca28d');shelf.addColorStop(1,'#6b584b');for(let i=0;i<columns;i++){const img=sprites.prizes[(row*columns+i)%21],scale=Math.min((shelfWidth-12)/columns/img.width,(spacing-15)/img.height),px=left+6+(i+.5)*(shelfWidth-12)/columns;g.save();g.shadowColor='#4c3d3766';g.shadowBlur=4;g.shadowOffsetY=2;g.drawImage(img,px-img.width*scale/2,sy-img.height*scale,img.width*scale,img.height*scale);g.restore();}rounded(g,left,sy,shelfWidth,9,shelf,2);}});

    insideClaw(g,view,()=>items.filter(i=>!i.taken&&i!==held).sort((a,b)=>(view?a.x-b.x:a.z-b.z)).forEach(i=>{const pose=clawPrizePose(i,view);drawPrize(g,i,pose.x,pose.y,pose.size,pose.size);}));
    insideClaw(g,view,()=>{const glass=clawGlass(view);g.globalAlpha=.1;g.fillStyle='#ffffff';g.beginPath();g.moveTo(glass.x+8,glass.y);g.lineTo(glass.x+68,glass.y);g.lineTo(glass.x+34,glass.y+glass.h);g.lineTo(glass.x+8,glass.y+glass.h);g.fill();g.globalAlpha=.24;g.strokeStyle='#ffffff';g.lineWidth=2;g.strokeRect(glass.x+3,glass.y+3,glass.w-6,glass.h-6);});
    let cx=clawX(view,view?z:x),cy=90;
    if(busy){const bottom=portraitLayout()?460:view?235:190;if(phase<1.15)cy=90+phase/1.15*(bottom-90);else if(phase<1.45)cy=bottom;else cy=bottom-Math.min(1,(phase-1.45)/1.1)*(bottom-90);if(phase>2.6&&held)cx+=(clawOutlet(view).x-cx)*Math.min(1,(phase-2.6)/.7);}
    const cable=g.createLinearGradient(cx-3,0,cx+4,0);cable.addColorStop(0,'#5a5754');cable.addColorStop(.5,'#efeeee');cable.addColorStop(1,'#686564');g.strokeStyle=cable;g.lineWidth=5;g.beginPath();g.moveTo(cx,32);g.lineTo(cx,cy-44);g.stroke();
    insideClaw(g,view,()=>drawContained(g,sprites.toys[11],cx-43,cy-50,86,112));if(held&&phase>=1.15){if(phase<3.35)insideClaw(g,view,()=>drawPrize(g,held,cx-34,cy+38,68,65));else{const u=Math.min(1,(phase-3.35)/.7);g.save();if(portraitLayout()){g.beginPath();g.rect(view?433:365,610,view?47:70,128);g.clip();}drawPrize(g,held,clawOutlet(view).x-29,(portraitLayout()?580:315)+u*(portraitLayout()?95:57),58,55);g.restore();}}
    dropButton.disabled=busy;
    if(won.length){g.save();if(portraitLayout()){g.beginPath();g.rect(view?433:365,610,view?47:70,128);g.clip();}drawContained(g,sprites.prizes[won[won.length-1]],clawOutlet(view).x-35,clawOutlet(view).y-27,70,62);g.restore();}
  });
}
function shootMenu() {choose('shoot','なにで あそぶ？',['じゅう','ゆみ','みずでっぽう'],sprites.toys.slice(8,11),shoot);}
const defaultShootingShelves=[{x:80,y:149,w:430},{x:80,y:318,w:430},{x:550,y:105,w:370},{x:550,y:212,w:370},{x:550,y:318,w:370}];
let shootingShelves=defaultShootingShelves;
function shootingItems(){shootingShelves=portraitLayout()?Array.from({length:5},(_,i)=>({x:24,y:151+i*149,w:432})):defaultShootingShelves;return Array.from({length:21},(_,i)=>{const bay=i<5?0:i<10?1:i<14?2:i<18?3:4,shelf=shootingShelves[bay],n=bay<2?5:bay<4?4:3,slot=i-[0,5,10,14,18][bay],large=bay===1&&slot%2===0,width=shelf.w/n*.93,height=portraitLayout()?127:large?151:bay===1?140:bay===4?101:bay===0?113:bay===2?91:94;return {x:shelf.x+(slot+.5)*shelf.w/n,y:shelf.y-height/2,toy:i,width,height,hp:large?3:1,maxHp:large?3:1,gone:false,tilt:0};});}
function shotResult(items,aim,gauge,angle=0){const distance=Math.abs(gauge-.5)*2*200,x=aim.x+Math.cos(angle)*distance,y=aim.y+Math.sin(angle)*distance;return {x,y,hit:[...items].reverse().find(i=>!i.gone&&Math.abs(i.x-x)<i.width/2&&Math.abs(i.y-y)<i.height/2)};}
function applyShot(item) {if(!item||item.gone)return false;item.hp--;item.tilt+=.15;item.gone=item.hp<=0;return item.gone;}
function shoot(weapon) {
  shell('shoot','けいひんを えらんで、もういちど タップで うつよ');const [c,g]=makeCanvas(portraitLayout()?480:1000,portraitLayout()?900:470);
  const items=shootingItems();let aim=null,gauge=0,active=false,bullet=null,message='すきな けいひんを タップ',count=0,shotAngle=0;
  const stop=document.createElement('button');stop.className='primary';stop.textContent='◎';stop.setAttribute('aria-label','ゲージを止めて発射');stop.disabled=true;stop.hidden=true;document.querySelector('#toolbar').append(stop);
  const label=document.createElement('span');label.className='progress';label.textContent='0 / 21';document.querySelector('#toolbar').append(label);
  function fire(){if(!active)return;active=false;stop.disabled=true;const shot=shotResult(items,aim,gauge,shotAngle);bullet={x:shot.x,y:shot.y,time:performance.now()};
    if(shot.hit){if(applyShot(shot.hit)){count++;label.textContent=`${count} / 21`;message='とれた！';}else message='ぐらぐら！ あと '+shot.hit.hp+' かい';}else message='もういちど やってみよう';aim=null;if(count===21)modal('ぜんぶ とれた！',shootMenu);
  }
  stop.onclick=fire;c.onclick=e=>{if(active){fire();return;}const p=point(e,c),target=[...items].reverse().find(i=>!i.gone&&Math.abs(i.x-p.x)<i.width/2+8&&Math.abs(i.y-p.y)<i.height/2+8);if(target){aim={x:p.x,y:p.y,width:target.width};shotAngle=Math.random()*Math.PI*2;active=true;stop.disabled=false;message='まんなかで とめてね';}};
  loop(t=>{
    if(active)gauge=(Math.sin(t/470)+1)/2;g.clearRect(0,0,c.width,c.height);g.drawImage(sprites.stages[0],0,0,c.width,portraitLayout()?830:345);
    for(const shelf of shootingShelves){const y=shelf.y;const wood=g.createLinearGradient(0,y,0,y+13);wood.addColorStop(0,'#b4804f');wood.addColorStop(.5,'#70411e');wood.addColorStop(1,'#452814');rounded(g,shelf.x,y,shelf.w,13,wood,2);}
    items.forEach(i=>{if(i.gone)return;g.save();g.translate(i.x,i.y+i.height/2);g.rotate(i.tilt);g.shadowColor='#38201366';g.shadowBlur=6;g.shadowOffsetY=3;
      const img=sprites.prizes[i.toy],scale=Math.min(i.width/img.width,i.height/img.height);g.drawImage(img,-img.width*scale/2,-img.height*scale,img.width*scale,img.height*scale);g.restore();
      if(i.maxHp>1){for(let j=0;j<i.maxHp;j++){g.fillStyle=j<i.hp?'#e8b653':'#705647';g.beginPath();g.arc(i.x+(j-(i.maxHp-1)/2)*12,i.y+i.height/2+5,4,0,Math.PI*2);g.fill();}}
    });
    if(aim){g.strokeStyle='#d76469';g.lineWidth=3;g.beginPath();g.arc(aim.x,aim.y,Math.max(32,aim.width/2+4),0,Math.PI*2);g.stroke();}
    if(active){g.fillStyle='#fff8e588';g.beginPath();g.arc(aim.x,aim.y,43,0,Math.PI*2);g.fill();g.strokeStyle='#64b48b';g.lineWidth=4;g.beginPath();g.arc(aim.x,aim.y,6,0,Math.PI*2);g.stroke();g.strokeStyle='#e37a8c';g.beginPath();g.arc(aim.x,aim.y,6+Math.abs(gauge-.5)*68,0,Math.PI*2);g.stroke();}

    if(bullet&&t-bullet.time<700){g.strokeStyle=weapon===2?'#48aeda':'#f3dc8f';g.lineWidth=5;g.beginPath();g.arc(bullet.x,bullet.y,12+(t-bullet.time)/45,0,Math.PI*2);g.stroke();}
    drawContained(g,sprites.toys[8+weapon],portraitLayout()?190:90,portraitLayout()?835:371,portraitLayout()?100:160,portraitLayout()?60:92);g.fillStyle='#715044';g.font='bold 21px sans-serif';g.textAlign='center';g.textBaseline='middle';
  });
}
const pinPegs=[{x:326,y:105,r:7},{x:437,y:100,r:7},{x:551,y:111,r:7},{x:311,y:164,r:6},{x:437,y:190,r:7},{x:564,y:178,r:6},{x:316,y:234,r:7},{x:540,y:242,r:6},{x:385,y:307,r:6},{x:509,y:284,r:7},{x:435,y:306,r:6},{x:310,y:311,r:6},{x:559,y:285,r:7},{x:475,y:364,r:6},{x:408,y:379,r:6}];
const pinRails=[{x:357,y:217,tx:383,ty:228},{x:483,y:220,tx:509,ty:209}];
const pinGuards=[{x:282,y:345,tx:365,ty:399,guard:true},{x:590,y:345,tx:507.18,ty:399,guard:true}];
function newPinState(){return {time:0,seesawAngle:0,seesawOmega:0,neon:Array(6).fill(false),bonus:0};}
function pinGimmicks(state){const a=state?.seesawAngle||0,dx=Math.cos(a)*40,dy=Math.sin(a)*40;return [
  {x:350,y:147,tx:410,ty:158,plate:true},{x:461,y:158,tx:520,ty:142,plate:true},
  {x:436-dx,y:265-dy,tx:436+dx,ty:265+dy,seesaw:true},
  {x:353,y:344,tx:388,ty:335,plate:true},{x:443,y:341,tx:467,ty:331,plate:true}
];}
function pinBars(){return [{x:320,y:281,len:40,side:1},{x:566,y:326,len:40,side:-1},{x:365,y:399,len:92*2/3,side:1},{x:507.18,y:399,len:92*2/3,side:-1}].map(b=>({...b,on:false,angle:.3,omega:0}));}
function advancePinBars(bars,dt){for(const bar of bars){bar.pulse=Math.max(0,(bar.pulse||0)-dt);bar.active=bar.on||bar.pulse>0;const old=bar.angle??.3,target=bar.active?-.5:.3,step=(bar.active?14:8)*dt;bar.angle=old+Math.max(-step,Math.min(step,target-old));bar.omega=dt?(bar.angle-old)/dt:0;}}
function barTip(bar){const a=bar.angle??.3;return {x:bar.x+bar.side*Math.cos(a)*bar.len,y:bar.y+Math.sin(a)*bar.len};}
function launchPinBall(){return {x:604,y:423,vx:0,vy:-680,launching:true};}
function bounceSegment(ball,segment,dt,active=false){
  const dx=segment.tx-segment.x,dy=segment.ty-segment.y,u=Math.max(0,Math.min(1,((ball.x-segment.x)*dx+(ball.y-segment.y)*dy)/(dx*dx+dy*dy))),qx=segment.x+u*dx,qy=segment.y+u*dy;
  let nx=ball.x-qx,ny=ball.y-qy,d=Math.hypot(nx,ny);const radius=12;
  if(d>=radius)return 0;if(d<.001){nx=0;ny=-1;d=1;}nx/=d;ny/=d;ball.x=qx+nx*radius;ball.y=qy+ny*radius;
  const angle=segment.angle??0,omega=segment.omega||0,surfaceVx=-segment.side*Math.sin(angle)*(segment.len||0)*u*omega||0,surfaceVy=Math.cos(angle)*(segment.len||0)*u*omega;
  const dot=(ball.vx-surfaceVx)*nx+(ball.vy-surfaceVy)*ny;if(dot>=0)return 0;
  const rebound=segment.guard?1.08:1.68;ball.vx-=rebound*dot*nx;ball.vy-=rebound*dot*ny;
  if(active){ball.vy=-Math.max(300,Math.abs(ball.vy));ball.vx+=segment.side*90;}
  return dot<-12?1:0;
}
function pinStep(ball,bars,dt,state=null){
  advancePinBars(bars,dt);
  if(state){state.time+=dt;state.seesawOmega=(state.seesawOmega-state.seesawAngle*2*dt)*Math.exp(-dt*1.5);state.seesawAngle=Math.max(-.28,Math.min(.28,state.seesawAngle+state.seesawOmega*dt));}
  if(ball.launching){ball.vy+=285*dt;ball.y+=ball.vy*dt;
    if(ball.y<=88){ball.launching=false;ball.x=576;ball.y=88;ball.vx=-145;ball.vy=-35;}
    return {lost:false,hits:0};
  }
  ball.vy+=285*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;let hits=0,lowerHits=0;
  if(ball.x<291){ball.x=291;ball.vx=Math.abs(ball.vx)*.84;}if(ball.x>581){ball.x=581;ball.vx=-Math.abs(ball.vx)*.84;}if(ball.y<72){ball.y=72;ball.vy=Math.abs(ball.vy)*.8;}
  for(const [index,peg] of pinPegs.entries()){const dx=ball.x-peg.x,dy=ball.y-peg.y,d=Math.hypot(dx,dy),r=peg.r+7;if(d<r){const nx=d?dx/d:1,ny=d?dy/d:0;ball.x=peg.x+nx*r;ball.y=peg.y+ny*r;const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.82*dot*nx;ball.vy-=1.82*dot*ny;ball.vx+=nx*18;ball.vy+=ny*18;hits++;if(state&&pinNeonTargets.includes(index)){const target=pinNeonTargets.indexOf(index);if(!state.neon[target]){state.neon[target]=true;state.bonus+=10;}}}}}
  for(const mechanism of pinGimmicks(state)){const hit=bounceSegment(ball,mechanism,dt);hits+=hit;if(hit&&mechanism.seesaw&&state)state.seesawOmega+=Math.max(-1.2,Math.min(1.2,(ball.x-436)*.025));}
  for(const rail of pinRails)hits+=bounceSegment(ball,rail,dt);
  for(const guard of pinGuards)bounceSegment(ball,guard,dt);
  for(const [i,bar] of bars.entries()){const tip=barTip(bar),hit=bounceSegment(ball,{...bar,tx:tip.x,ty:tip.y},dt,bar.active);hits+=hit;if(i>=2)lowerHits+=hit;}
  ball.vx=Math.max(-430,Math.min(430,ball.vx));ball.vy=Math.max(-620,Math.min(620,ball.vy));return {lost:ball.y>449,hits,lowerHits};
}
const pinBarColors=['#24cbe5','#83da3e','#ef5595','#9574ed'];
const pinNeonTargets=[0,2,4,7,9,11];
const pinNeonColors=['#64eafa','#ffc35d','#ff85cc','#aa8bff','#85ef91','#ff9d69'];
const pinLedPictures=[];
function drawPinNeon(g,i,lit){
  if(!pinLedPictures[i]){const source=document.createElement('canvas');source.width=40;source.height=56;const sg=source.getContext('2d');drawContained(sg,sprites.prizes[[0,2,3,5,6,9][i]],0,0,40,56);const pixels=sg.getImageData(0,0,40,56).data;
    pinLedPictures[i]=[false,true].map(on=>{const panel=document.createElement('canvas');panel.width=100;panel.height=140;const pg=panel.getContext('2d');for(let y=0;y<56;y++)for(let x=0;x<40;x++){const k=(y*40+x)*4;if(pixels[k+3]<110)continue;const strength=on?1:.23;pg.fillStyle='rgb('+Math.round(pixels[k]*strength)+','+Math.round(pixels[k+1]*strength)+','+Math.round(pixels[k+2]*strength)+')';pg.shadowColor=pg.fillStyle;pg.shadowBlur=on?2:0;pg.beginPath();pg.arc(1.25+x*2.45,1.25+y*2.45,on?1:.85,0,Math.PI*2);pg.fill();}return panel;});
  }const x=i<3?291:506,y=86+(i%3)*111;g.drawImage(pinLedPictures[i][lit?1:0],x,y,65,91);
}
function drawPinBoard(g,t,bars,ball,state=null){
  const bg=g.createLinearGradient(0,0,900,470);bg.addColorStop(0,'#071223');bg.addColorStop(.5,'#24243c');bg.addColorStop(1,'#0b1124');rounded(g,0,0,900,470,bg,15);

  rounded(g,264,18,372,439,'#526170',18);
  g.drawImage(assets.cabinet,156,20,660,185,264,12,372,47);g.drawImage(assets.cabinet,153,220,93,670,264,59,22,384);g.drawImage(assets.cabinet,731,220,93,670,614,59,22,384);g.drawImage(assets.cabinet,115,922,743,168,264,443,372,18);
  const board=g.createLinearGradient(0,55,0,440);board.addColorStop(0,'#142e47');board.addColorStop(1,'#23243e');rounded(g,282,59,336,384,board,12);
  g.save();g.beginPath();g.rect(282,59,308,384);g.clip();g.globalAlpha=.15;g.drawImage(sprites.puzzles[4],282,59,308,384);g.restore();
  for(let i=0;i<6;i++)drawPinNeon(g,i,!!state?.neon[i]);
  g.save();g.strokeStyle=t%1400<700?'#65dbe8':'#db7cdb';g.lineWidth=3;g.shadowColor=g.strokeStyle;g.shadowBlur=8;g.strokeRect(282,59,336,384);g.restore();
  // A separate unobstructed launch channel carries the ball above the playfield.
  g.fillStyle='#52667866';g.fillRect(594,92,20,349);g.strokeStyle='#beced299';g.lineWidth=2;g.beginPath();g.moveTo(590,443);g.lineTo(590,108);g.stroke();
  g.fillStyle='#b9e8f120';for(let y=99;y<421;y+=29)for(let x=307;x<575;x+=29){g.beginPath();g.arc(x,y,2,0,Math.PI*2);g.fill();}
  for(const [i,p] of pinPegs.entries()){g.save();g.shadowColor='#d3b784';g.shadowBlur=6;const metal=g.createRadialGradient(p.x-4,p.y-4,1,p.x,p.y,p.r);metal.addColorStop(0,'#fff');metal.addColorStop(.4,'#d9bb80');metal.addColorStop(.85,'#304559');metal.addColorStop(1,'#ccdce5');g.fillStyle=metal;g.beginPath();g.arc(p.x,p.y,p.r,0,Math.PI*2);g.fill();g.restore();}
  for(const rail of pinRails){g.lineCap='round';g.strokeStyle='#dbb169';g.lineWidth=8;g.beginPath();g.moveTo(rail.x,rail.y);g.lineTo(rail.tx,rail.ty);g.stroke();g.lineWidth=3;g.strokeStyle='#ffe6a5';g.stroke();}
  for(const mechanism of pinGimmicks(state)){g.lineCap='round';g.lineWidth=10;g.strokeStyle=mechanism.seesaw?'#ecb668':'#b9bbc1';g.beginPath();g.moveTo(mechanism.x,mechanism.y);g.lineTo(mechanism.tx,mechanism.ty);g.stroke();g.lineWidth=4;g.strokeStyle=mechanism.seesaw?'#9b6b2a':'#666a73';g.stroke();if(mechanism.seesaw){g.fillStyle='#e8bec9';g.beginPath();g.arc(436,265,5,0,Math.PI*2);g.fill();}}
  for(const [i,pegIndex] of pinNeonTargets.entries()){const peg=pinPegs[pegIndex];g.fillStyle=pinNeonColors[i];g.font='bold 13px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('★',peg.x,peg.y);g.textBaseline='alphabetic';}
  for(const guard of pinGuards){g.fillStyle='#456681dd';g.beginPath();g.moveTo(guard.x,guard.y);g.lineTo(guard.tx,guard.ty);g.lineTo(guard.x,443);g.closePath();g.fill();g.lineCap='round';g.lineWidth=10;g.strokeStyle='#c6e4e9';g.beginPath();g.moveTo(guard.x,guard.y);g.lineTo(guard.tx,guard.ty);g.stroke();g.lineWidth=5;g.strokeStyle='#53bcce';g.stroke();}
  for(let i=0;i<4;i++){g.fillStyle=pinBarColors[i];g.beginPath();g.arc(350+i*56,450,7,0,Math.PI*2);g.fill();}
  for(const [i,bar] of bars.entries()){const tip=barTip(bar);g.save();g.lineCap='round';g.lineWidth=10;g.strokeStyle='#d9e2eb';g.beginPath();g.moveTo(bar.x,bar.y);g.lineTo(tip.x,tip.y);g.stroke();g.lineWidth=5;g.strokeStyle=pinBarColors[i];g.shadowColor=pinBarColors[i];g.shadowBlur=bar.active?12:0;g.stroke();g.restore();}
  if(ball){const gold=g.createRadialGradient(ball.x-2,ball.y-3,1,ball.x,ball.y,8);gold.addColorStop(0,'#fff9d1');gold.addColorStop(.3,'#ffe779');gold.addColorStop(.75,'#c59223');gold.addColorStop(1,'#714717');g.fillStyle=gold;g.beginPath();g.arc(ball.x,ball.y,7,0,Math.PI*2);g.fill();}
  const glass=g.createLinearGradient(280,60,530,430);glass.addColorStop(0,'#ffffff0c');glass.addColorStop(.5,'#ffffff00');glass.addColorStop(1,'#ffffff04');rounded(g,287,62,326,375,glass,12);
}
function pinball(){
  shell('pinball','ほしに あてると ネオンが つくよ！');const [c,g]=makeCanvas(portraitLayout()?420:900,portraitLayout()?760:470),bars=pinBars();let ball=null,last=0,score=0,state=newPinState();
  const toolbar=document.querySelector('#toolbar');toolbar.classList.add('pin-toolbar');
  const launch=document.createElement('button');launch.className='primary neon-launch';launch.textContent='●';launch.setAttribute('aria-label','金球を発射');toolbar.append(launch);
  const scoreLabel=document.createElement('span');scoreLabel.className='progress';scoreLabel.textContent='はねた！ 0 かい';toolbar.append(scoreLabel);
  launch.onclick=()=>{if(ball)return;score=0;state=newPinState();ball=launchPinBall();launch.disabled=true;scoreLabel.textContent='はねた！ 0 かい';document.querySelector('.instruction').textContent='ほしを ねらって ネオンを つけよう！';};
  const pads=document.createElement('div');pads.className='pin-controls';toolbar.prepend(pads);
  bars.forEach((bar,i)=>{const b=document.createElement('button');b.className='pin-pad pin-pad-'+i;b.textContent='';b.style.setProperty('--bar-color',pinBarColors[i]);b.setAttribute('aria-label',['ひだり うえ','みぎ うえ','ひだり した','みぎ した'][i]+'のバー');
    const press=()=>{bar.on=true;bar.pulse=.15;b.classList.add('pressed');},release=()=>{bar.on=false;b.classList.remove('pressed');};
    b.onpointerdown=e=>{press();b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=release;
    b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press();}};b.onkeyup=b.onblur=release;pads.append(b);
  });
  loop(t=>{const dt=last?Math.min((t-last)/1000,.05):0;last=t;
    if(ball){for(let n=0;n<6;n++){const result=pinStep(ball,bars,dt/6,state);score+=result.hits;if(result.lost){ball=null;launch.disabled=false;launch.textContent='●';document.querySelector('.instruction').textContent='ゲームオーバー！ もういちど はっしゃしてね';break;}}scoreLabel.textContent=state.neon.every(Boolean)?'ネオン ぜんぶ ついた！':('はねた！ '+score+' かい'+(state.bonus?' ＋ '+state.bonus:''));}
    if(!ball)advancePinBars(bars,dt);g.save();if(portraitLayout())g.setTransform(1.1,0,0,1.6,-285,0);drawPinBoard(g,t,bars,ball,state);g.restore();
  });
}

app.innerHTML='<div class="loading">おへやを じゅんびしています…</div>';
const imageLoads={};
function loadImage(name){if(assets[name])return Promise.resolve();if(imageLoads[name])return imageLoads[name];imageLoads[name]=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{assets[name]=img;resolve();};img.onerror=()=>{delete imageLoads[name];reject(new Error(name));};img.src=window.GAME_IMAGES?.[name]||name+'.webp';});return imageLoads[name];}
loadImage('room').then(home).catch(()=>{app.innerHTML='<div class="loading">おへやを よみこめませんでした。<button class="round" onclick="location.reload()">もういちど</button></div>';});


