/* Портал-проводник: дашборды-планеты вокруг логотипа (three.js).
   Подключение: three.min.js, затем planets.js; Planets.init(секция, список, onGo).
   Пункт списка: {n, d, u, img, c1, c2, r, s, sz, tilt, ring}. Крутится пальцем, после отпускания
   плавно возвращается к своей скорости. Вне экрана и на скрытой вкладке не рисует. */
(function(){
window.Planets={init:function(box,P,onGo){
  if(!window.THREE){ box.classList.add('noGL'); return; }
  var cv=box.querySelector('canvas.pl3'), lab=box.querySelector('.plLab'), card=box.querySelector('.plCard');
  var mob=matchMedia('(pointer:coarse)').matches, red=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var R; try{ R=new THREE.WebGLRenderer({canvas:cv,antialias:!mob,alpha:true,powerPreference:'low-power'}); }catch(e){ box.classList.add('noGL'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio||1, mob?1.25:1.75)); R.setClearColor(0x000000,0);
  var S=new THREE.Scene(), C=new THREE.PerspectiveCamera(50,1,.1,400), sys=new THREE.Group(); sys.rotation.x=.42; S.add(sys);

  function glow(c){ var s=128,n=document.createElement('canvas'); n.width=n.height=s; var x=n.getContext('2d'), g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    g.addColorStop(0,c); g.addColorStop(.35,c+'66'); g.addColorStop(1,c+'00'); x.fillStyle=g; x.fillRect(0,0,s,s); return new THREE.CanvasTexture(n); }
  function skin(c1,c2){ var w=256,h=128,n=document.createElement('canvas'); n.width=w; n.height=h; var x=n.getContext('2d'), g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,c1); g.addColorStop(1,c2); x.fillStyle=g; x.fillRect(0,0,w,h);
    for(var i=0;i<14;i++){ x.globalAlpha=.08+Math.random()*.14; x.fillStyle=i%2?'#fff':'#000'; x.fillRect(0,Math.random()*h,w,2+Math.random()*9); }
    x.globalAlpha=1; return new THREE.CanvasTexture(n); }

  // звёзды вокруг системы (фон-галактика страницы просвечивает сквозь сцену)
  (function(){ var n=mob?500:1000, g=new THREE.BufferGeometry(), a=new Float32Array(n*3);
    for(var i=0;i<n;i++){ var r=40+Math.random()*80, t=Math.random()*6.283, p=Math.acos(2*Math.random()-1);
      a[i*3]=r*Math.sin(p)*Math.cos(t); a[i*3+1]=r*Math.cos(p); a[i*3+2]=r*Math.sin(p)*Math.sin(t); }
    g.setAttribute('position',new THREE.BufferAttribute(a,3));
    S.add(new THREE.Points(g,new THREE.PointsMaterial({size:.45,color:0xdfe4ff,transparent:true,opacity:.75,depthWrite:false}))); })();

  // ядро: логотип СПЕКТР на светящемся диске
  var core=new THREE.Group(); sys.add(core);
  var logo=new THREE.Sprite(new THREE.SpriteMaterial({color:0xffffff,depthWrite:false})); logo.scale.set(2.6,2.6,1); core.add(logo);
  new THREE.TextureLoader().load('logo.webp',function(t){ logo.material.map=t; logo.material.needsUpdate=true; });
  var cg=new THREE.Sprite(new THREE.SpriteMaterial({map:glow('#7cf3ff'),blending:THREE.AdditiveBlending,depthWrite:false})); cg.scale.set(7,7,1); core.add(cg);
  var rb=new THREE.Mesh(new THREE.TorusGeometry(1.75,.045,8,120),new THREE.MeshBasicMaterial({color:0xff7ce0})); rb.rotation.x=Math.PI/2; sys.add(rb);
  S.add(new THREE.AmbientLight(0x404a80,.9)); sys.add(new THREE.PointLight(0xffffff,1.6,60));

  P.forEach(function(p,i){
    var o=new THREE.Group(); o.rotation.z=p.tilt||0; sys.add(o);
    var rg=new THREE.Mesh(new THREE.RingGeometry(p.r-.012,p.r+.012,160),new THREE.MeshBasicMaterial({color:0x8a92ff,transparent:true,opacity:.32,side:THREE.DoubleSide}));
    rg.rotation.x=Math.PI/2; o.add(rg);
    var pv=new THREE.Group(); pv.rotation.y=i*1.6; o.add(pv);
    var m=new THREE.Mesh(new THREE.SphereGeometry(p.sz,32,24),new THREE.MeshStandardMaterial({map:skin(p.c1,p.c2),roughness:.75,metalness:.05,emissive:new THREE.Color(p.c2),emissiveIntensity:.18}));
    m.position.x=p.r; pv.add(m);
    var gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glow(p.c1),blending:THREE.AdditiveBlending,depthWrite:false,opacity:.7})); gl.scale.set(p.sz*4,p.sz*4,1); m.add(gl);
    if(p.ring){ var rr=new THREE.Mesh(new THREE.RingGeometry(p.sz*1.35,p.sz*1.9,64),new THREE.MeshBasicMaterial({color:new THREE.Color(p.c1),transparent:true,opacity:.45,side:THREE.DoubleSide})); rr.rotation.x=1.2; m.add(rr); }
    m.userData.i=i; p.mesh=m; p.pv=pv;
    var el=document.createElement('button'); el.type='button'; el.className='plL'; el.textContent=p.n; el.style.setProperty('--pc',p.c1);
    el.onclick=function(){ focusOn(i); }; lab.appendChild(el); p.el=el;
  });

  var home=new THREE.Vector3(0,2.2,19), cam=home.clone(), look=new THREE.Vector3(), lt=new THREE.Vector3(), v=new THREE.Vector3(), O=new THREE.Vector3();
  var W=1,H=1;
  function size(){ W=box.clientWidth; H=box.clientHeight; R.setSize(W,H,false); C.aspect=W/H; C.fov=W<H?64:46; C.updateProjectionMatrix(); home.z=W<H?21:17; }
  size(); addEventListener('resize',size);

  // палец: горизонталь крутит систему (вертикаль на телефоне листает страницу), с инерцией
  var vel=0, drag=false, lx=0, ly=0, tilt=.42, moved=0, focus=-1, ray=new THREE.Raycaster(), mv=new THREE.Vector2();
  cv.addEventListener('pointerdown',function(e){ drag=true; moved=0; lx=e.clientX; ly=e.clientY; box.classList.add('drag'); });
  addEventListener('pointermove',function(e){ if(!drag) return; var dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
    vel=dx*.006; sys.rotation.y+=vel; if(e.pointerType==='mouse') tilt=Math.max(.05,Math.min(1.1,tilt+dy*.003)); });
  addEventListener('pointerup',function(e){ if(!drag) return; drag=false; box.classList.remove('drag');
    if(moved<8 && e.target===cv){ var r=cv.getBoundingClientRect(); mv.x=(e.clientX-r.left)/r.width*2-1; mv.y=-((e.clientY-r.top)/r.height)*2+1; ray.setFromCamera(mv,C);
      var h=ray.intersectObjects(P.map(function(p){return p.mesh;}),false)[0]; if(h) focusOn(h.object.userData.i); else if(focus>=0) unfocus(); } });
  addEventListener('pointercancel',function(){ drag=false; box.classList.remove('drag'); });

  var cT=card.querySelector('h3'), cD=card.querySelector('p'), cGo=card.querySelector('.plGo');
  function focusOn(i){ focus=i; var p=P[i]; cT.textContent=p.n; cD.textContent=p.d; card.style.setProperty('--c1',p.c1); card.style.setProperty('--c2',p.c2);
    card.classList.add('on'); box.classList.add('foc'); }
  function unfocus(){ focus=-1; card.classList.remove('on'); box.classList.remove('foc'); }
  card.querySelector('.plBack').onclick=unfocus;
  cGo.onclick=function(){ if(focus<0) return; var p=P[focus]; cGo.classList.add('lit'); setTimeout(function(){ onGo(card,p); setTimeout(function(){ cGo.classList.remove('lit'); },900); },red?0:480); };
  addEventListener('keydown',function(e){ if(e.key==='Escape') unfocus(); });

  var on=true, clock=new THREE.Clock(), t=0;
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ on=es[0].isIntersecting; if(on){ clock.getDelta(); loop(); } },{rootMargin:'80px'}).observe(box);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&on){ clock.getDelta(); loop(); } });
  var raf=0;
  function loop(){ if(raf) return; raf=requestAnimationFrame(frame); }
  function frame(){ raf=0; if(!on||document.hidden) return;
    var dt=Math.min(clock.getDelta(),.05), sp=red?.2:1; t+=dt;
    if(!drag){ vel+=(0-vel)*Math.min(1,dt*2.2); sys.rotation.y+=vel+(focus<0?.03*dt*sp:0); }
    sys.rotation.x+=(tilt-sys.rotation.x)*Math.min(1,dt*4);
    P.forEach(function(p){ if(focus<0) p.pv.rotation.y+=p.s*dt*sp*.5; p.mesh.rotation.y+=dt*.4; });
    rb.material.color.setHSL((t*.05)%1,.9,.62); cg.scale.setScalar(6.6+Math.sin(t*1.6)*.35);
    if(focus>=0){ P[focus].mesh.getWorldPosition(lt); v.copy(lt).normalize().multiplyScalar(4.2+P[focus].sz*4).add(lt); v.y+=1.4; lt.y-=W<H?1.5:.6;
      cam.lerp(v,Math.min(1,dt*2.4)); look.lerp(lt,Math.min(1,dt*3)); }
    else { cam.lerp(home,Math.min(1,dt*1.8)); look.lerp(O,Math.min(1,dt*2)); }
    C.position.copy(cam); C.lookAt(look); R.render(S,C);
    P.forEach(function(p,i){ p.mesh.getWorldPosition(v); var d=v.distanceTo(C.position); v.project(C);
      var vis=v.z<1&&(focus<0||focus===i); p.el.style.opacity=vis?1:0; p.el.style.pointerEvents=vis?'auto':'none';
      p.el.style.transform='translate('+((v.x*.5+.5)*W)+'px,'+((-v.y*.5+.5)*H+p.sz*260/d+6)+'px) translate(-50%,0)'; });
    raf=requestAnimationFrame(frame); }
  loop();
}};
})();
