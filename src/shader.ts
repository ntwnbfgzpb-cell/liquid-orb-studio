export const shader = `
struct U { resolution: vec2f, time: f32, speed: f32, c1: vec4f, c2: vec4f, c3: vec4f, shape: vec4f, glass: vec4f, glow: vec4f, material: vec4f, }
@group(0) @binding(0) var<uniform> u: U;

fn hash31(p: vec3f) -> f32 { return fract(sin(dot(p, vec3f(127.1,311.7,74.7))) * 43758.5453); }
fn valueNoise(p: vec3f) -> f32 {
  let i=floor(p); let f=fract(p); let q=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3f(1,0,0)),q.x),mix(hash31(i+vec3f(0,1,0)),hash31(i+vec3f(1,1,0)),q.x),q.y),mix(mix(hash31(i+vec3f(0,0,1)),hash31(i+vec3f(1,0,1)),q.x),mix(hash31(i+vec3f(0,1,1)),hash31(i+vec3f(1,1,1)),q.x),q.y),q.z);
}
fn fbm(p0: vec3f) -> f32 {
  var p=p0; var sum=0.0; var amplitude=0.55;
  for(var octave=0; octave<4; octave++){ sum+=valueNoise(p)*amplitude; p=p*2.03+vec3f(17.1,9.2,13.7); amplitude*=0.48; }
  return sum;
}
fn background(uv: vec2f) -> vec3f {
  let vignette=1.0-smoothstep(0.08,1.45,length(uv*vec2f(0.78,1.0)));
  var color=mix(vec3f(0.001,0.003,0.009),vec3f(0.009,0.026,0.058),vignette);
  let cell=floor(uv.xyx*vec3f(170.0,120.0,91.0)); let star=step(0.997,hash31(cell))*(1.0-smoothstep(0.15,1.3,length(uv)));
  color+=star*mix(u.c1.rgb,vec3f(1.0),0.78)*0.34; return color;
}
fn floorReflection(uv: vec2f) -> vec3f {
  let gate=smoothstep(0.43,0.53,uv.y)*(1.0-smoothstep(0.72,1.05,uv.y));
  let footprint=exp(-pow(abs(uv.x)*2.05,2.0)); let shallow=exp(-pow((uv.y-0.61)*7.4,2.0));
  let breakup=0.42+0.58*fbm(vec3f(uv.x*7.0,uv.y*19.0,u.time*0.11));
  let streaks=0.58+0.42*pow(abs(sin(uv.x*31.0+breakup*4.0)),5.0);
  let split=mix(u.c1.rgb,u.c2.rgb,smoothstep(-0.22,0.28,uv.x));
  return split*footprint*shallow*gate*breakup*streaks*u.material.y*0.92;
}
@vertex fn vs(@builtin(vertex_index) index:u32)->@builtin(position) vec4f {
  let positions=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(positions[index],0,1);
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
  var uv=(position.xy/u.resolution)*2.0-1.0; uv.x*=u.resolution.x/u.resolution.y; uv.y+=0.08;
  let ro=vec3f(0,0,2.85); let rd=normalize(vec3f(uv,-1.82)); let radius=u.shape.x*0.58;
  let b=dot(ro,rd); let c=dot(ro,ro)-radius*radius; let discriminant=b*b-c;
  let shadow=exp(-pow(abs(uv.x)*2.35,2.0))*exp(-pow((uv.y-0.56)*10.5,2.0));
  var color=(background(uv)+floorReflection(uv))*(1.0-shadow*0.38);
  if(discriminant<=0.0){
    let auraRadius=0.62*u.shape.x*u.glow.y; let aura=exp(-max(0.0,length(uv)-auraRadius)*(13.0-u.material.w*2.0));
    color+=u.c1.rgb*aura*u.glow.x*(0.018+u.material.w*0.018); return vec4f(color,1);
  }
  let distanceTravelled=-b-sqrt(discriminant); let point=ro+rd*distanceTravelled; let time=u.time*u.speed;
  let warpScale=2.6+u.shape.y*3.3; let warp=fbm(point*warpScale+vec3f(time*0.15,-time*0.11,time*0.08));
  let micro=fbm(point*(warpScale*2.15)+vec3f(5.7,1.9,8.2));
  let normalWarp=vec3f(warp-0.48,micro-0.46,warp-micro)*u.shape.z*0.085;
  let normal=normalize(point+normalWarp); let view=-rd; let facing=saturate(dot(view,normal)); let ior=max(1.01,u.glass.x);
  let f0=pow((ior-1.0)/(ior+1.0),2.0); let fresnel=f0+(1.0-f0)*pow(1.0-facing,5.0);
  let phaseA=(point.x*0.72+point.y*0.94-point.z*0.34)*10.5+warp*13.0+time*(0.78+u.glass.w);
  let phaseB=(point.x*-0.48+point.y*0.57+point.z*0.86)*13.0+micro*15.0-time*0.62;
  let ribbonA=pow(saturate(1.0-abs(sin(phaseA))),7.0); let ribbonB=pow(saturate(1.0-abs(sin(phaseB))),10.0);
  let filament=pow(saturate(1.0-abs(sin(phaseA*2.7-phaseB*0.42))),18.0);
  let veinMask=saturate(ribbonA*0.82+ribbonB*0.7+filament*0.58);
  let refractedUv=uv+normal.xy*(0.055+u.glass.z*0.045)*(1.0-facing*0.35);
  let refractedScene=background(refractedUv)*mix(0.42,0.72,u.material.x);
  let colorFlow=smoothstep(0.24,0.78,warp+point.x*0.13); let ribbonColor=mix(u.c1.rgb,u.c2.rgb,colorFlow);
  let secondaryColor=mix(u.c3.rgb,u.c2.rgb,smoothstep(0.25,0.8,micro));
  var glassColor = refractedScene+mix(u.c1.rgb,u.c2.rgb,warp)*0.045*u.glass.y;
  glassColor+=ribbonColor*ribbonA*(0.68+u.material.z*0.34); glassColor+=secondaryColor*ribbonB*(0.48+u.material.z*0.28);
  glassColor+=mix(u.c1.rgb,vec3f(1.0),0.72)*filament*u.material.z*0.52;
  let fleckCell=floor((point+vec3f(0.9))*43.0); let flecks=step(0.983,hash31(fleckCell))*smoothstep(0.2,0.9,micro)*(0.25+facing*0.75);
  glassColor+=mix(u.c1.rgb,vec3f(1.0),0.82)*flecks*(0.48+u.material.z*0.24);
  let lightA=normalize(vec3f(-0.5,0.76,0.48)); let lightB=normalize(vec3f(0.68,0.24,0.7));
  let broadHighlight=pow(saturate(dot(reflect(-lightA,normal),view)),18.0)*0.82;
  let sharpHighlight=pow(saturate(dot(reflect(-lightA,normal),view)),mix(90.0,240.0,u.material.x))*2.9;
  let sideHighlight=pow(saturate(dot(reflect(-lightB,normal),view)),mix(45.0,130.0,u.material.x))*1.05;
  let thinRim=pow(1.0-facing,mix(2.2,5.2,u.material.x)); let edgeLine=smoothstep(0.72,0.98,1.0-facing);
  let reflectedSky=mix(u.c2.rgb,vec3f(0.76,0.93,1.0),saturate(normal.y*0.5+0.5));
  glassColor=mix(glassColor,reflectedSky,fresnel*u.material.y*0.62);
  glassColor+=vec3f(broadHighlight+sharpHighlight)+u.c3.rgb*sideHighlight;
  glassColor+=mix(u.c1.rgb,vec3f(1.0),0.74)*thinRim*(0.38+u.glow.x*0.28);
  glassColor+=mix(u.c1.rgb,u.c3.rgb,saturate(normal.x*0.5+0.5))*edgeLine*0.72;
  glassColor+=ribbonColor*veinMask*fresnel*u.material.w*0.16;
  return vec4f(glassColor,1);
}`;
