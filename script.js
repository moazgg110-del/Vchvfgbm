(()=>{"use strict";
const $=id=>document.getElementById(id),canvas=$("screen"),ctx=canvas.getContext("2d");
const CW=960,CH=540,MAX=200;
const worlds=[
["الغابة القديمة","#183b32","#4b8155","#a2d77a"],["كهوف الكريستال","#172e49","#3d7195","#8de8ff"],["صحراء العمالقة","#583923","#a66c36","#ffd17c"],["مدينة الفولاذ","#263343","#647c91","#a9dcf4"],["مستنقع الأرواح","#263a2d","#66804c","#d5ed86"],["قمم الجليد","#244254","#81b9d0","#e1faff"],["مصنع التروس","#383039","#8d6570","#ffbe7a"],["مقبرة الملوك","#29223b","#67507f","#d6a5ff"],["معبد البرق","#252b50","#6875b4","#fff29a"],["قلعة الظلال","#351d35","#824568","#ff9ac3"]];
let stage=1,coins=0,lives=3,battery=100,ammo=40,game=false,paused=false,flash=false,day=true,volume=.55,muted=false;
let player,plats=[],foes=[],bullets=[],pickups=[],particles=[],camera=0,door,keys={},touch={},last=0,elapsed=0,audio=null,shop={power:0,boots:0,capacity:0,armor:0},saved={};
let world=worlds[0],dark=false,weather=0,shakeUntil=0,toastT,sensorFound=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
function sound(freq=440,dur=.09,type="sine",vol=.13){if(muted||volume<=0)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==="suspended")audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.55),audio.currentTime+dur);g.gain.setValueAtTime(vol*volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur);}catch(e){}}
function noise(){sound(120,.13,"sawtooth",.08)}
function buzz(p=40){if(navigator.vibrate)navigator.vibrate(p)}
function say(s){let t=$("toast");t.textContent=s;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1700)}
function save(){saved={stage,coins,lives,battery,ammo,shop};try{localStorage.setItem("shadowPlatformSave",JSON.stringify(saved))}catch(e){}}
function load(){try{saved=JSON.parse(localStorage.getItem("shadowPlatformSave")||"{}");stage=clamp(saved.stage||1,1,MAX);coins=saved.coins||0;lives=saved.lives||3;battery=saved.battery??100;ammo=saved.ammo??40;shop={...shop,...saved.shop}}catch(e){}}
function ui(){$("lives").textContent=lives;$("coins").textContent=coins;$("battery").textContent=Math.ceil(battery);$("level").textContent=`${stage} / ${MAX}`;$("ammo").textContent=`طلقات: ${ammo}`;$("worldName").textContent=world[0]}
function ground(y=CH-55){return {x:0,y,w:2600,h:55}}
function makeLevel(){
 world=worlds[Math.floor((stage-1)/20)%worlds.length];dark=stage%5===0||stage%9===0;weather=stage%4;
 const seed=stage*37,mode=(stage-1)%10;plats=[ground()];
 // Ten distinct route blueprints rotate through all 200 stages.
 const layouts=[
  [[180,370,150],[390,315,130],[590,365,170],[830,285,145],[1050,340,160],[1280,270,150],[1510,350,170],[1760,290,150],[2000,355,170],[2250,300,150]],
  [[190,320,170],[420,260,155],[650,205,145],[870,285,170],[1100,350,180],[1350,275,150],[1580,210,150],[1810,285,170],[2050,350,170],[2300,285,160]],
  [[170,390,190],[430,350,140],[640,300,140],[850,250,140],[1060,300,140],[1270,350,140],[1480,300,140],[1690,250,140],[1900,300,140],[2140,350,190]],
  [[180,280,180],[420,360,150],[650,280,150],[880,360,150],[1110,280,150],[1340,360,150],[1570,280,150],[1800,360,150],[2030,280,150],[2260,350,170]],
  [[180,350,220],[480,290,110],[650,220,110],[820,290,110],[990,360,220],[1280,290,110],[1450,220,110],[1620,290,110],[1790,360,220],[2110,300,200]],
  [[180,390,150],[390,330,150],[600,270,150],[810,210,150],[1020,270,150],[1230,330,150],[1440,390,150],[1650,330,150],[1860,270,150],[2110,330,220]],
  [[180,300,260],[520,370,130],[720,300,130],[920,230,130],[1120,370,130],[1320,300,130],[1520,230,130],[1720,370,130],[1920,300,130],[2150,330,200]],
  [[180,360,140],[380,260,140],[580,360,140],[780,260,140],[980,360,140],[1180,260,140],[1380,360,140],[1580,260,140],[1780,360,140],[1980,260,140],[2200,350,180]],
  [[180,250,180],[430,250,180],[680,330,180],[930,330,180],[1180,250,180],[1430,250,180],[1680,330,180],[1930,330,180],[2180,280,190]],
  [[180,380,170],[410,310,170],[640,240,170],[870,310,170],[1100,380,170],[1330,310,170],[1560,240,170],[1790,310,170],[2020,380,170],[2250,300,180]]
 ];
 let shift=(stage%3)*13;for(let i=0;i<layouts[mode].length;i++){let [x,y,w]=layouts[mode][i];plats.push({x:x+shift,y:y+((stage+i)%3-1)*9,w,h:18});}
 // Small optional stepping stones add a different rhythm on every stage.
 for(let i=0;i<3+(stage%3);i++){let x=300+i*560+(stage%4)*21;plats.push({x,y:CH-70-(i%2)*22-(stage%4)*4,w:85+(stage%2)*22,h:14});}
 const endX=Math.max(...plats.map(p=>p.x+p.w));plats[0].w=endX+300;door={x:endX+100,y:CH-135,w:48,h:80,open:false};
 const n=3+Math.floor(stage/4);foes=[];
 for(let i=0;i<n;i++){let p=plats[1+(i*2)%(plats.length-1)];foes.push({x:p.x+rand(20,Math.max(21,p.w-20)),y:p.y-28,hp:stage%10===0&&i===0?5:1+Math.floor(stage/45),max:stage%10===0&&i===0?5:1+Math.floor(stage/45),r:stage%10===0&&i===0?25:18,dir:Math.random()<.5?-1:1,min:p.x,maxX:p.x+p.w,speed:45+stage*.35+(i%3)*13,kind:(stage+i)%4,boss:stage%10===0&&i===0,hit:0});}
 bullets=[];pickups=[];particles=[];sensorFound=false;
 for(let i=0;i<Math.max(5,Math.floor(door.x/260));i++){let p=plats[1+(i*3)%(plats.length-1)];pickups.push({x:p.x+p.w/2,y:p.y-30,type:i%6===0?"battery":"coin",got:false});}
 player={x:65,y:CH-120,vx:0,vy:0,w:28,h:43,on:false,face:1,inv:0,walk:0};camera=0;elapsed=0;battery=Math.min(100,battery+12);ammo=Math.min(80,ammo+8);
 const special=stage%9===0?"حرّك الهاتف أو اضغط زر الاستشعار لكشف الطريق":"";
 $("mission").textContent=stage%5===0?"مرحلة ظلام: شغّل الكشاف قبل عبور باب الخروج":(special||"اعبر المسار المتغير، اهزم الوحوش، واجمع الكنوز");ui();say(`المرحلة ${stage}: ${world[0]}`);
}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function burst(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-120,120),vy:rand(-150,30),life:rand(.25,.65),color})}
function jump(){if(!game||paused)return;if(player.on){player.vy=-565-shop.boots*35;player.on=false;sound(260,.12,"triangle");buzz(20)}}
function fire(){if(!game||paused||ammo<=0)return;if(player.cool>0)return;player.cool=.24;ammo--;let x=player.face>0?player.x+player.w:player.x-9;bullets.push({x,y:player.y+18,vx:player.face*610,life:1.6});sound(620,.11,"square",.1);burst(x,player.y+18,"#ffcf7b",3);ui()}
function hitPlayer(){if(player.inv>0)return;player.inv=1.25;lives--;noise();buzz([100,50,130]);burst(player.x+14,player.y+20,"#ff637e",14);if(lives<=0){lives=3;stage=Math.max(1,stage-1);say("حاول مرة أخرى! رجعت مرحلة واحدة");makeLevel()}else say("انتبه! اصطدمت بأحد الوحوش");save();ui()}
function update(dt){
 elapsed+=dt;player.cool=Math.max(0,(player.cool||0)-dt);player.inv=Math.max(0,player.inv-dt);
 let left=keys.ArrowLeft||keys.a||touch.left,right=keys.ArrowRight||keys.d||touch.right;
 let dir=(right?1:0)-(left?1:0);if(dir){player.vx+=dir*1900*dt;player.face=dir;player.walk+=dt*12}else player.vx*=Math.pow(.0008,dt);
 player.vx=clamp(player.vx,-245-shop.boots*12,245+shop.boots*12);
 player.vy+=1450*dt;player.vy=Math.min(player.vy,850);
 const oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=clamp(player.x,0,door.x+250);
 player.on=false;
 for(const p of plats){if(player.vy>=0&&oldY+player.h<=p.y+4&&player.y+player.h>=p.y&&player.x+player.w>p.x&&player.x<p.x+p.w){player.y=p.y-player.h;player.vy=0;player.on=true;}}
 if(player.y>CH+100){hitPlayer();player.x=Math.max(30,camera+50);player.y=CH-140;player.vy=0}
 // enemies patrol and collide
 for(let i=foes.length-1;i>=0;i--){let e=foes[i];e.x+=e.dir*e.speed*dt;if(e.x<e.min+4||e.x>e.maxX-4)e.dir*=-1;e.hit=Math.max(0,e.hit-dt);
  if(rectHit({x:player.x,y:player.y,w:player.w,h:player.h},{x:e.x-e.r,y:e.y-e.r*1.5,w:e.r*2,h:e.r*1.5})){if(player.vy>100&&player.y+player.h<e.y+10){e.hp--;player.vy=-340;burst(e.x,e.y,"#ffb46d",8);sound(170,.12,"triangle");if(e.hp<=0){foes.splice(i,1);coins+=e.boss?20:4; say(e.boss?"هزمت زعيم المرحلة!":"هزمت وحشًا!");}}else hitPlayer();}
 }
 for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];b.x+=b.vx*dt;b.life-=dt;let gone=b.life<=0;for(let j=foes.length-1;j>=0;j--){let e=foes[j];if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+7){e.hp-=1+shop.power*.5;burst(b.x,b.y,"#ffd27b",6);sound(210,.07,"square");gone=true;if(e.hp<=0){foes.splice(j,1);coins+=e.boss?25:5;}break;}}if(gone)bullets.splice(i,1);}
 for(const p of pickups)if(!p.got&&Math.hypot(player.x+14-p.x,player.y+20-p.y)<28){p.got=true;if(p.type==="coin"){coins+=2; sound(880,.1,"sine")}else{battery=Math.min(100,battery+35);say("بطارية كشاف +35%")}burst(p.x,p.y,p.type==="coin"?"#ffe08a":"#80eaff",8);}
 if(dark&&flash)battery=Math.max(0,battery-2.5*dt);if(battery<=0)flash=false;
 if(player.x+player.w>door.x&&player.y+player.h>door.y&&player.y<door.y+door.h){if(foes.length===0&&(!(stage%5===0)||flash)&&(!(stage%9===0)||sensorFound)){if(stage<MAX)stage++;else stage=1;coins+=15;save();makeLevel();say("مرحلة جديدة! +15 عملة");}else if(foes.length) say("اهزم الوحوش أولًا حتى يفتح الباب");else if(stage%5===0&&!flash)say("هذه المرحلة تحتاج تشغيل الكشاف!");else if(stage%9===0&&!sensorFound)say("استخدم الاستشعار لكشف ممر الخروج!");}
 camera=clamp(player.x- CW*.36,0,Math.max(0,door.x-CW+150));
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
 ui();
}
function polygon(x,y,r,n,color){ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<n;i++){let a=i*Math.PI*2/n-Math.PI/2;let xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.fill()}
function draw(){
 const night=dark||!day;let sky=night?"#081322":world[1];let grad=ctx.createLinearGradient(0,0,0,CH);grad.addColorStop(0,sky);grad.addColorStop(1,world[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,CW,CH);
 // parallax mountain silhouettes and drifting particles
 for(let layer=0;layer<3;layer++){ctx.fillStyle=layer===0?"#07101c55":layer===1?world[2]+"88":world[1];ctx.beginPath();ctx.moveTo(0,CH);for(let x=-100;x<CW+150;x+=120){let h=90+((x*7+stage*19+layer*61)%130);ctx.lineTo(x,h+layer*42);ctx.lineTo(x+60,h-50+layer*42)}ctx.lineTo(CW,CH);ctx.fill();}
 // Animated scenery unique to the current biome: trees, crystal spires and ruins.
 for(let i=0;i<18;i++){let sx=((i*173-camera*.22)%(CW+180)+CW+180)%(CW+180)-60,base=CH-54;let sway=Math.sin(elapsed*1.4+i)*4;ctx.save();ctx.translate(sx,base);if(stage%20<5){ctx.fillStyle="#39291f";ctx.fillRect(-5,-58,10,58);ctx.fillStyle=world[3];ctx.beginPath();ctx.arc(sway,-66,25+(i%3)*5,0,7);ctx.fill();ctx.beginPath();ctx.arc(-13+sway,-48,18,0,7);ctx.fill()}else if(stage%20<10){ctx.fillStyle=world[3]+"bb";ctx.beginPath();ctx.moveTo(0,-75);ctx.lineTo(20,-15);ctx.lineTo(-18,-15);ctx.closePath();ctx.fill()}else{ctx.fillStyle="#17202c";ctx.fillRect(-13,-48,26,48);ctx.fillStyle=world[3];ctx.fillRect(-16,-53,32,7)}ctx.restore();}
 ctx.save();ctx.translate(-camera,0);
 // platforms with layered stone/wood, glowing trim
 for(let p of plats){let gr=ctx.createLinearGradient(0,p.y,0,p.y+p.h);gr.addColorStop(0,world[3]);gr.addColorStop(.35,world[2]);gr.addColorStop(1,"#17202b");ctx.fillStyle=gr;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#ffffff35";ctx.fillRect(p.x,p.y,p.w,3);ctx.fillStyle="#050a15aa";for(let x=p.x+12;x<p.x+p.w-5;x+=35)ctx.fillRect(x,p.y+8,18,3);}
 // door
 ctx.save();ctx.shadowBlur=22;ctx.shadowColor=world[3];ctx.fillStyle=foes.length?"#351b2a":"#244936";ctx.fillRect(door.x,door.y,door.w,door.h);ctx.strokeStyle=foes.length?"#ff687f":world[3];ctx.lineWidth=5;ctx.strokeRect(door.x,door.y,door.w,door.h);ctx.fillStyle=world[3];ctx.beginPath();ctx.arc(door.x+door.w/2,door.y+21,11,Math.PI,0);ctx.fill();ctx.fillStyle="#ffe6a0";ctx.beginPath();ctx.arc(door.x+door.w-10,door.y+43,3,0,7);ctx.fill();ctx.restore();
 // collectibles
 for(const p of pickups)if(!p.got){ctx.save();ctx.translate(p.x,p.y+Math.sin(elapsed*3+p.x)*4);if(p.type==="coin"){ctx.fillStyle="#ffcf69";ctx.shadowColor="#ffcf69";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();ctx.fillStyle="#9b6728";ctx.fillRect(-2,-6,4,12)}else{ctx.fillStyle="#78eaff";ctx.shadowBlur=15;ctx.shadowColor="#78eaff";ctx.fillRect(-7,-11,14,22);ctx.fillStyle="#e7ffff";ctx.fillRect(-3,-6,6,12)}ctx.restore();}
 // enemies distinct types
 for(const e of foes){ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.dir,1);ctx.shadowBlur=e.boss?23:12;ctx.shadowColor=e.boss?"#ff557e":"#ff7b5b";let body=["#8e3850","#426b92","#6b8b46","#79518e"][e.kind];ctx.fillStyle=e.hit>0?"#fff":body;
 ctx.beginPath();ctx.ellipse(0,-e.r*.55,e.r,e.r*1.08,0,0,7);ctx.fill();
 // horns / ears
 ctx.fillStyle="#2a1a2a";polygon(-e.r*.55,-e.r*1.25,e.r*.38,3,"#33203a");polygon(e.r*.55,-e.r*1.25,e.r*.38,3,"#33203a");
 ctx.fillStyle="#ffe9a4";ctx.fillRect(-e.r*.48,-e.r*.8,5,4);ctx.fillRect(e.r*.2,-e.r*.8,5,4);
 ctx.fillStyle="#21131e";ctx.fillRect(-e.r*.25,-e.r*.1,e.r*.5,3);
 if(e.boss){ctx.strokeStyle="#ffb0c7";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-e.r*.6,e.r+6,Math.PI,Math.PI*2);ctx.stroke();}
 ctx.restore();if(e.boss){ctx.fillStyle="#260f1b";ctx.fillRect(e.x-25,e.y-e.r*2-12,50,5);ctx.fillStyle="#ff6286";ctx.fillRect(e.x-25,e.y-e.r*2-12,50*e.hp/e.max,5);}}
 // bullets
 for(const b of bullets){ctx.save();ctx.shadowBlur=17;ctx.shadowColor="#ffd77b";ctx.fillStyle="#fff0b0";ctx.beginPath();ctx.ellipse(b.x,b.y,10,4,0,0,7);ctx.fill();ctx.restore();}
 // player with cape, boots, weapon
 const px=player.x,py=player.y;ctx.save();ctx.translate(px+14,py+22);if(player.inv>0&&Math.floor(elapsed*16)%2)ctx.globalAlpha=.4;
 ctx.fillStyle="#743c36";ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(-17,13);ctx.lineTo(-3,10);ctx.closePath();ctx.fill();
 ctx.fillStyle="#e2b37d";ctx.beginPath();ctx.arc(0,-13,9,0,7);ctx.fill();ctx.fillStyle="#2a3041";ctx.fillRect(-8,-5,16,18);ctx.fillStyle="#d5e4ed";let step=Math.sin(player.walk)*3;ctx.fillRect(-8+step,11,6,10);ctx.fillRect(3-step,11,6,10);
 ctx.fillStyle="#a9d6e8";ctx.fillRect(5,-4,16,4);ctx.fillStyle="#ffe1a2";ctx.fillRect(17,-7,7,3);
 ctx.restore();
 ctx.restore();
 // dynamic atmosphere: fireflies / stars / rain streaks
 for(let i=0;i<38;i++){let x=(i*97+elapsed*(dark?7:14))%CW,y=(i*53+Math.sin(elapsed+i)*13)%CH;if(dark){ctx.fillStyle="#b5edff88";ctx.fillRect(x,y,2,2)}else{ctx.fillStyle="#ffffff22";ctx.fillRect(x,y,2,2)}}
 if(weather===1){ctx.strokeStyle="#b4eaff35";for(let i=0;i<65;i++){let x=(i*41+elapsed*130)%CW,y=(i*73+elapsed*260)%CH;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+14);ctx.stroke();}}
 // dark stage flashlight mask, digital torch
 if(dark){ctx.save();ctx.fillStyle="rgba(0,3,12,.94)";ctx.fillRect(0,0,CW,CH);ctx.globalCompositeOperation="destination-out";let radius=flash?245:115;let lx=player.x-camera+14,ly=player.y+18;let g=ctx.createRadialGradient(lx,ly,8,lx,ly,radius);g.addColorStop(0,"rgba(0,0,0,1)");g.addColorStop(.72,"rgba(0,0,0,.75)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(lx,ly,radius,0,7);ctx.fill();ctx.restore();}
 // particles
 for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-camera,p.y,3,0,7);ctx.fill();ctx.globalAlpha=1;}
 // battery bar + health bar visual
 ctx.fillStyle="#0008";ctx.fillRect(15,CH-20,110,6);ctx.fillStyle="#7de8f5";ctx.fillRect(15,CH-20,110*battery/100,6);
}
function frame(t){if(!game||paused)return;let dt=Math.min((t-last)/1000||0,.033);last=t;update(dt);ctx.clearRect(0,0,CW,CH);draw();requestAnimationFrame(frame)}
function start(){game=true;paused=false;$("overlay").classList.add("hidden");last=performance.now();requestAnimationFrame(frame);sound(480,.18,"triangle");buzz(45)}
function show(html){$("modalBody").innerHTML=html;$("modal").classList.remove("hidden")}
function close(){ $("modal").classList.add("hidden")}
const items=[["power","قوة السلاح","تزيد ضرر الطلقات",35,5],["boots","حذاء القفز","قفز أعلى وحركة أسرع",45,5],["capacity","بطارية كبيرة","تقلل استهلاك الكشاف",40,5],["armor","درع حماية","يمنح قلبًا إضافيًا",60,3]];
function shopUI(){show(`<h2>🛒 متجر المغامر</h2><p>رصيدك: ${coins} 🪙</p><div class="shopGrid">${items.map(([id,n,d,c,m])=>`<div class="item"><b>${n}</b><small>${d}<br>المستوى ${shop[id]}/${m}</small><button data-item="${id}">${shop[id]>=m?"مكتمل":`شراء ${c+shop[id]*20} 🪙`}</button></div>`).join("")}</div>`);$("modalBody").querySelectorAll("[data-item]").forEach(b=>b.onclick=()=>{let id=b.dataset.item,it=items.find(x=>x[0]===id),cost=it[3]+shop[id]*20;if(shop[id]>=it[4])return;if(coins<cost){say("عملاتك لا تكفي");return}coins-=cost;shop[id]++;if(id==="armor")lives=Math.min(6,lives+1);save();ui();shopUI();sound(900,.14,"sine")})}
function settingsUI(){show(`<h2>⚙️ إعدادات اللعبة</h2><label class="setting">مستوى الصوت <input id="vol" type="range" min="0" max="100" value="${volume*100}"></label><label class="setting">كتم الأصوات <input id="mute" type="checkbox" ${muted?"checked":""}></label><label class="setting">الوقت <select id="time"><option value="day" ${day?"selected":""}>نهار</option><option value="night" ${!day?"selected":""}>ليل</option></select></label><p>الأصوات يتم توليدها داخل اللعبة ولا تحتاج إلى ملفات إنترنت.</p>`);$("vol").oninput=e=>volume=+e.target.value/100;$("mute").onchange=e=>muted=e.target.checked;$("time").onchange=e=>day=e.target.value==="day"}
function about(){show(`<h2>حول اللعبة</h2><p><b>مغامرات الظلال</b><br>لعبة منصات ثنائية الأبعاد تضم 200 مرحلة موزعة على عوالم متنوعة، مع وحوش وزعماء ومتجر وتطويرات ومؤثرات صوتية وضوئية.</p><p>تم التطوير بواسطة المبرمج<br><b style="color:#ffe2a1">معاذ محمد عبد النبي</b></p>`)}
function pause(){if(!game)return;paused=true;show(`<h2>إيقاف مؤقت</h2><p>تقدمك محفوظ تلقائيًا.</p><button class="buy" id="resume">استكمال اللعب</button><button class="buy" id="pShop">المتجر</button>`);$("resume").onclick=()=>{close();paused=false;last=performance.now();requestAnimationFrame(frame)};$("pShop").onclick=shopUI}
async function flashlight(){flash=!flash;if(flash){say("الكشاف الرقمي يعمل");battery=Math.max(0,battery-1);try{if(!window._torch&&navigator.mediaDevices?.getUserMedia){window._torch=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})}let tr=window._torch?.getVideoTracks()[0],cap=tr?.getCapabilities?.();if(cap?.torch)await tr.applyConstraints({advanced:[{torch:true}]})}catch(e){}}else{try{let tr=window._torch?.getVideoTracks()[0];if(tr)await tr.applyConstraints({advanced:[{torch:false}]})}catch(e){}}buzz(30);ui()}
function pulseShake(){sensorFound=true;shakeUntil=performance.now()+1800;for(let e of foes)if(Math.abs(e.x-player.x)<270)e.hit=.4;sound(100,.22,"sawtooth");buzz([50,30,80]);say("اهتزاز استشعار: تم كشف الوحوش القريبة")}
function motion(){try{if(typeof DeviceMotionEvent!=="undefined"&&DeviceMotionEvent.requestPermission)DeviceMotionEvent.requestPermission().then(v=>{if(v==="granted")listenMotion()}).catch(()=>{});else listenMotion()}catch(e){}}
function listenMotion(){let lastShake=0;addEventListener("devicemotion",e=>{let a=e.accelerationIncludingGravity;if(!a)return;let n=Math.hypot(a.x||0,a.y||0,a.z||0);if(n>24&&Date.now()-lastShake>1800&&game&&!paused){lastShake=Date.now();pulseShake()}})}
$("start").onclick=()=>{makeLevel();start();motion()};$("pause").onclick=pause;$("flash").onclick=flashlight;$("shake").onclick=pulseShake;$("shop").onclick=shopUI;$("menuShop").onclick=shopUI;$("settings").onclick=settingsUI;$("about").onclick=about;$("close").onclick=close;$("modal").onclick=e=>{if(e.target===$("modal"))close()};
$("jump").onpointerdown=e=>{e.preventDefault();jump()};$("fire").onpointerdown=e=>{e.preventDefault();fire()};
document.querySelectorAll("[data-move]").forEach(b=>{let d=b.dataset.move;b.onpointerdown=e=>{e.preventDefault();touch[d]=true;b.setPointerCapture(e.pointerId)};["pointerup","pointercancel","lostpointercapture"].forEach(ev=>b.addEventListener(ev,()=>touch[d]=false))});
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key===" "||e.key==="ArrowUp")jump();if(e.key==="f"||e.key==="F")fire()});addEventListener("keyup",e=>keys[e.key]=false);
load();makeLevel();ui();
})();