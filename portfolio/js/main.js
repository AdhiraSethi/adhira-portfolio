(function(){
  var root=document.documentElement;
  var mqDark=window.matchMedia('(prefers-color-scheme: dark)');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':mqDark.matches;}
  try{var s=localStorage.getItem('theme');if(s==='light'||s==='dark'){root.setAttribute('data-theme',s);}}catch(e){}

  /* theme toggle */
  var themeBtn=document.getElementById('theme');
  var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';
  function syncThemeBtn(){
    var dark=isDark();
    themeBtn.innerHTML=dark?SUN:MOON;
    themeBtn.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
  }
  themeBtn.addEventListener('click',function(){
    var next=isDark()?'light':'dark';
    root.setAttribute('data-theme',next);
    try{localStorage.setItem('theme',next);}catch(e){}
    syncThemeBtn();
    window.dispatchEvent(new Event('themechange'));
  });
  if(mqDark.addEventListener){mqDark.addEventListener('change',function(){syncThemeBtn();window.dispatchEvent(new Event('themechange'));});}
  syncThemeBtn();

  /* mobile menu */
  var menuBtn=document.getElementById('menu'),links=document.getElementById('links');
  function closeMenu(){links.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');}
  menuBtn.addEventListener('click',function(){var o=links.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(o));});
  links.addEventListener('click',function(e){if(e.target.closest('a')){closeMenu();}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeMenu();}});

  /* pointer tilt */
  var canHover=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(canHover&&!reduce.matches){
    document.querySelectorAll('[data-tilt]').forEach(function(el){
      var max=parseFloat(el.getAttribute('data-tilt'))||6;
      el.addEventListener('pointermove',function(e){
        var r=el.getBoundingClientRect();
        var px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
        el.style.setProperty('--ry',((px-.5)*2*max).toFixed(2)+'deg');
        el.style.setProperty('--rx',((.5-py)*2*max).toFixed(2)+'deg');
        el.style.setProperty('--mx',(px*100).toFixed(1)+'%');
        el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      });
      el.addEventListener('pointerleave',function(){
        ['--rx','--ry','--mx','--my'].forEach(function(p){el.style.removeProperty(p);});
      });
    });
  }

  /* climate heatmap illustration */
  (function(){
    var hm=document.getElementById('heat');if(!hm)return;
    var cols=16,rows=7,stops=['--cool','--g3','--g2','--g1'];
    function colorAt(v){
      var seg=Math.min(Math.max(v,0),.999)*3,i=Math.floor(seg),f=seg-i;
      return 'color-mix(in srgb, var('+stops[i+1]+') '+Math.round(f*100)+'%, var('+stops[i]+'))';
    }
    var frag=document.createDocumentFragment();
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        var season=Math.sin(((c-3)/12)*Math.PI*2);
        var v=.46+.30*season+.12*Math.sin(r*2.1+c*.9)+(r/(rows-1)-.5)*.26;
        var cell=document.createElement('i');
        cell.style.background=colorAt(v);
        frag.appendChild(cell);
      }
    }
    hm.appendChild(frag);
  })();

  /* 3D hand scene */
  (function(){
    var stage=document.getElementById('stage'),canvas=document.getElementById('scene');
    if(!stage||!canvas)return;
    if(typeof THREE==='undefined'){stage.classList.add('no-webgl');return;}
    var renderer;
    try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});}
    catch(e){stage.classList.add('no-webgl');return;}
    renderer.setClearColor(0x000000,0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

    var animate=!reduce.matches;
    function clamp(v,a,b){return Math.min(b,Math.max(a,v));}

    var scene=new THREE.Scene();
    var camera=new THREE.PerspectiveCamera(42,1,.1,100);
    camera.position.set(0,0,9.2);

    var C={g1:new THREE.Color(),g2:new THREE.Color(),g3:new THREE.Color(),cool:new THREE.Color()};
    var tmpC=new THREE.Color();
    var FT=[.5,0,.25,.5,.75,1]; /* slot 0 wrist, 1 thumb ... 5 pinky */
    function colorAt(t,out){
      if(t<.5){out.lerpColors(C.g1,C.g2,t*2);}else{out.lerpColors(C.g2,C.g3,(t-.5)*2);}
      return out;
    }
    function slotOf(i){return i===0?0:1+Math.floor((i-1)/4);}

    /* soft round sprite */
    var gc=document.createElement('canvas');gc.width=gc.height=64;
    var gx=gc.getContext('2d'),gr=gx.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
    gx.fillStyle=gr;gx.fillRect(0,0,64,64);
    var glowTex=new THREE.CanvasTexture(gc);

    /* lights */
    scene.add(new THREE.AmbientLight(0xffffff,.55));
    var L1=new THREE.PointLight(0xffffff,1.3,40);L1.position.set(-4,3,6);scene.add(L1);
    var L2=new THREE.PointLight(0xffffff,1.1,40);L2.position.set(5,-3,5);scene.add(L2);
    var L3=new THREE.PointLight(0xffffff,.9,40);L3.position.set(0,3,-5);scene.add(L3);

    /* hand */
    var hand=new THREE.Group(),inner=new THREE.Group();
    inner.position.set(.45,-.2,0);
    hand.add(inner);scene.add(hand);

    var mats=FT.map(function(){return new THREE.MeshStandardMaterial({roughness:.35,metalness:.15});});
    var sphereGeo=new THREE.SphereGeometry(1,20,16);
    var boneGeo=new THREE.CylinderGeometry(1,1,1,10,1);
    var CONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
    var P=[],joints=[],bones=[];
    for(var i=0;i<21;i++){
      P.push(new THREE.Vector3());
      var m=new THREE.Mesh(sphereGeo,mats[slotOf(i)]);
      var rad=i===0?.12:(i%4===0?.1:.075);
      m.scale.setScalar(rad);
      inner.add(m);joints.push(m);
    }
    CONN.forEach(function(c){
      var b=new THREE.Mesh(boneGeo,mats[slotOf(c[1])]);
      inner.add(b);bones.push(b);
    });

    /* palm fill */
    var palmIdx=[0,1,5,0,5,9,0,9,13,0,13,17];
    var palmPos=new Float32Array(palmIdx.length*3);
    var palmGeo=new THREE.BufferGeometry();
    palmGeo.setAttribute('position',new THREE.BufferAttribute(palmPos,3));
    var palm=new THREE.Mesh(palmGeo,new THREE.MeshBasicMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false}));
    palm.frustumCulled=false;inner.add(palm);

    /* glow halos */
    var haloPos=new Float32Array(21*3),haloCol=new Float32Array(21*3);
    var haloGeo=new THREE.BufferGeometry();
    haloGeo.setAttribute('position',new THREE.BufferAttribute(haloPos,3));
    haloGeo.setAttribute('color',new THREE.BufferAttribute(haloCol,3));
    var halo=new THREE.Points(haloGeo,new THREE.PointsMaterial({size:1.05,map:glowTex,vertexColors:true,transparent:true,depthWrite:false}));
    halo.frustumCulled=false;inner.add(halo);

    /* rings */
    function ring(radius,tube,rx,ry,key){
      var m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,160),new THREE.MeshBasicMaterial({transparent:true,opacity:.7}));
      m.rotation.set(rx,ry,0);m.userData.key=key;scene.add(m);return m;
    }
    var rings=[ring(2.95,.014,1.15,.3,'g2'),ring(2.4,.012,.35,1.1,'g3'),ring(3.5,.009,1.6,-.5,'g1')];

    /* floating shapes */
    var floaters=[];
    function floater(geo,solid,key,pos,speed){
      var mat=solid?new THREE.MeshStandardMaterial({flatShading:true,roughness:.3,metalness:.3}):new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:.85});
      var m=new THREE.Mesh(geo,mat);
      m.position.set(pos[0],pos[1],pos[2]);
      m.userData={key:key,base:pos.slice(),speed:speed,phase:Math.random()*6.28,solid:solid};
      scene.add(m);floaters.push(m);
    }
    floater(new THREE.IcosahedronGeometry(.3,0),true,'g2',[-2.5,2.3,-.4],.6);
    floater(new THREE.OctahedronGeometry(.26,0),false,'cool',[2.6,1.7,.6],.8);
    floater(new THREE.TetrahedronGeometry(.3,0),false,'g2',[2.3,-2.4,-.3],.7);
    floater(new THREE.TorusKnotGeometry(.2,.065,48,8),true,'g3',[-2.4,-2.1,.7],.9);
    floater(new THREE.IcosahedronGeometry(.16,0),false,'g1',[.6,3.1,-1],.5);

    /* dust */
    var N=220,dp=new Float32Array(N*3);
    for(var d=0;d<N;d++){
      var r=3+Math.random()*4.2,th=Math.random()*6.283,ph=Math.acos(2*Math.random()-1);
      dp[d*3]=r*Math.sin(ph)*Math.cos(th);dp[d*3+1]=r*Math.sin(ph)*Math.sin(th);dp[d*3+2]=r*Math.cos(ph)-1;
    }
    var dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dp,3));
    var dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.09,map:glowTex,transparent:true,depthWrite:false}));
    dust.frustumCulled=false;scene.add(dust);

    /* hand kinematics */
    var FING=[
      {mcp:[-.72,.15,0],len:[.7,.45,.4],fan:.12},
      {mcp:[-.24,.30,0],len:[.78,.5,.42],fan:.03},
      {mcp:[.24,.20,0],len:[.7,.47,.4],fan:-.05},
      {mcp:[.70,0,0],len:[.55,.35,.33],fan:-.16}
    ];
    var TH_OPEN=[[-.45,-1.15,0],[-.95,-.75,.1],[-1.35,-.35,.15],[-1.65,0,.15]];
    var TH_FOLD=[[-.45,-1.15,0],[-.85,-.65,.35],[-.7,-.2,.6],[-.3,-.3,.65]];
    var BEND=[1.2,1.5,1.0];
    function solve(curl,fan){
      P[0].set(0,-1.6,0);
      var k,o,f,c=curl[0];
      for(k=0;k<4;k++){
        o=TH_OPEN[k];f=TH_FOLD[k];
        P[1+k].set(o[0]+(f[0]-o[0])*c,o[1]+(f[1]-o[1])*c,o[2]+(f[2]-o[2])*c);
      }
      for(var i=0;i<4;i++){
        var F=FING[i],cc=curl[i+1],a=F.fan+fan[i],sa=Math.sin(a),ca=Math.cos(a);
        var x=F.mcp[0],y=F.mcp[1],z=F.mcp[2],base=5+i*4,A=0;
        P[base].set(x,y,z);
        for(var s=0;s<3;s++){
          A+=cc*BEND[s];
          var dy=Math.cos(A),dz=Math.sin(A),L=F.len[s];
          x+=-sa*dy*L;y+=ca*dy*L;z+=dz*L;
          P[base+1+s].set(x,y,z);
        }
      }
    }

    var POSES=[
      {name:'Open hand',curl:[0,0,0,0,0],fan:[.02,0,-.02,-.05]},
      {name:'I love you',curl:[0,0,1,1,0],fan:[.12,0,0,-.14]},
      {name:'Peace',curl:[1,0,0,1,1],fan:[.17,-.09,0,0]},
      {name:'Point',curl:[1,0,1,1,1],fan:[0,0,0,0]},
      {name:'Closed fist',curl:[1,1,1,1,1],fan:[0,0,0,0]}
    ];
    var poseIdx=0,cur={curl:POSES[0].curl.slice(),fan:POSES[0].fan.slice()},use=[0,0,0,0,0];
    var poseName=document.getElementById('poseName'),nextBtn=document.getElementById('nextPose');
    var ptr={x:0,y:0,tx:0,ty:0};
    window.addEventListener('pointermove',function(e){
      ptr.tx=(e.clientX/window.innerWidth-.5)*2;ptr.ty=(e.clientY/window.innerHeight-.5)*2;
    },{passive:true});

    var Y=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3();
    function updateBone(m,a,b){
      tmp.subVectors(b,a);var len=tmp.length()||.0001;
      m.position.addVectors(a,b).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(Y,tmp.normalize());
      m.scale.set(.03,len,.03);
    }

    function draw(dt,t,snap){
      var tgt=POSES[poseIdx],k=snap?1:1-Math.exp(-dt*5.5),i;
      for(i=0;i<5;i++){cur.curl[i]+=(tgt.curl[i]-cur.curl[i])*k;}
      for(i=0;i<4;i++){cur.fan[i]+=(tgt.fan[i]-cur.fan[i])*k;}
      var w=animate?1:0;
      for(i=0;i<5;i++){use[i]=clamp(cur.curl[i]+Math.sin(t*1.7+i*.9)*.035*w,0,1);}
      solve(use,cur.fan);
      for(i=0;i<21;i++){
        joints[i].position.copy(P[i]);
        haloPos[i*3]=P[i].x;haloPos[i*3+1]=P[i].y;haloPos[i*3+2]=P[i].z;
      }
      haloGeo.attributes.position.needsUpdate=true;
      for(i=0;i<CONN.length;i++){updateBone(bones[i],P[CONN[i][0]],P[CONN[i][1]]);}
      for(i=0;i<palmIdx.length;i++){
        var p=P[palmIdx[i]];palmPos[i*3]=p.x;palmPos[i*3+1]=p.y;palmPos[i*3+2]=p.z;
      }
      palmGeo.attributes.position.needsUpdate=true;

      var k2=snap?1:1-Math.exp(-dt*3);
      ptr.x+=(ptr.tx-ptr.x)*k2;ptr.y+=(ptr.ty-ptr.y)*k2;
      hand.rotation.y=-.35+Math.sin(t*.45)*.35*w+ptr.x*.5;
      hand.rotation.x=-.1+ptr.y*.3+Math.sin(t*.35)*.05*w;
      hand.position.y=Math.sin(t*.9)*.08*w;
      for(i=0;i<rings.length;i++){
        rings[i].rotation.z+=dt*(.22+i*.09)*(i%2?-1:1);
        rings[i].rotation.x+=dt*.05;
      }
      for(i=0;i<floaters.length;i++){
        var f=floaters[i],u=f.userData;
        f.position.y=u.base[1]+Math.sin(t*u.speed+u.phase)*.22*w;
        f.rotation.x+=dt*.5*u.speed;f.rotation.y+=dt*.7*u.speed;
      }
      dust.rotation.y+=dt*.03;
      renderer.render(scene,camera);
    }

    function applyTheme(){
      var cs=getComputedStyle(root),dark=isDark(),i;
      C.g1.set(cs.getPropertyValue('--g1').trim());
      C.g2.set(cs.getPropertyValue('--g2').trim());
      C.g3.set(cs.getPropertyValue('--g3').trim());
      C.cool.set(cs.getPropertyValue('--cool').trim());
      for(i=0;i<FT.length;i++){
        colorAt(FT[i],tmpC);
        mats[i].color.copy(tmpC);mats[i].emissive.copy(tmpC);mats[i].emissiveIntensity=dark?.6:.22;
      }
      for(i=0;i<21;i++){
        colorAt(FT[slotOf(i)],tmpC);
        haloCol[i*3]=tmpC.r;haloCol[i*3+1]=tmpC.g;haloCol[i*3+2]=tmpC.b;
      }
      haloGeo.attributes.color.needsUpdate=true;
      halo.material.blending=dark?THREE.AdditiveBlending:THREE.NormalBlending;
      halo.material.opacity=dark?.6:.28;halo.material.needsUpdate=true;
      palm.material.color.copy(C.g2);palm.material.opacity=dark?.16:.13;
      rings.forEach(function(r){r.material.color.copy(C[r.userData.key]);r.material.opacity=dark?.7:.6;});
      floaters.forEach(function(f){
        f.material.color.copy(C[f.userData.key]);
        if(f.userData.solid){f.material.emissive.copy(C[f.userData.key]);f.material.emissiveIntensity=dark?.35:.12;}
      });
      dust.material.color.copy(dark?C.cool:C.g3);
      dust.material.blending=dark?THREE.AdditiveBlending:THREE.NormalBlending;
      dust.material.opacity=dark?.75:.45;dust.material.needsUpdate=true;
      L1.color.copy(C.g2);L2.color.copy(C.g3);L3.color.copy(dark?C.cool:C.g1);
      if(!running){draw(0,performance.now()/1000,true);}
    }

    function resize(){
      var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.position.z=9.2*Math.max(1,.95/camera.aspect);
      camera.updateProjectionMatrix();
      if(!running){draw(0,performance.now()/1000,true);}
    }

    var raf=0,running=false,last=0,nextSwitch=0,inView=true;
    function setPose(i){
      poseIdx=(i+POSES.length)%POSES.length;
      poseName.textContent=POSES[poseIdx].name;
      if(!running){draw(0,performance.now()/1000,true);}
    }
    function loop(now){
      if(!running)return;
      var dt=Math.min((now-last)/1000,.05);last=now;
      if(now>nextSwitch){setPose(poseIdx+1);nextSwitch=now+3400;}
      draw(dt,now/1000,false);
      raf=requestAnimationFrame(loop);
    }
    function start(){
      if(running||!animate)return;
      running=true;last=performance.now();nextSwitch=last+3000;
      raf=requestAnimationFrame(loop);
    }
    function stop(){running=false;cancelAnimationFrame(raf);}
    nextBtn.addEventListener('click',function(){
      setPose(poseIdx+1);nextSwitch=performance.now()+5000;
    });

    applyTheme();
    resize();
    window.addEventListener('themechange',applyTheme);
    if('ResizeObserver' in window){new ResizeObserver(resize).observe(stage);}else{window.addEventListener('resize',resize);}
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        inView=es[0].isIntersecting;
        if(inView&&!document.hidden){start();}else{stop();}
      },{threshold:.05}).observe(stage);
    }else{start();}
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){stop();}else if(inView){start();}
    });
  })();
})();
