export const shader = `
struct U { resolution:vec2f, time:f32, speed:f32, c1:vec4f, c2:vec4f, c3:vec4f, shape:vec4f, glass:vec4f, glow:vec4f }
@group(0) @binding(0) var<uniform> u:U;
fn hash(p:vec3f)->f32{return fract(sin(dot(p,vec3f(127.1,311.7,74.7)))*43758.5453);}
fn noise(p:vec3f)->f32{let i=floor(p);let f=fract(p);let q=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3f(1,0,0)),q.x),mix(hash(i+vec3f(0,1,0)),hash(i+vec3f(1,1,0)),q.x),q.y),mix(mix(hash(i+vec3f(0,0,1)),hash(i+vec3f(1,0,1)),q.x),mix(hash(i+vec3f(0,1,1)),hash(i+vec3f(1,1,1)),q.x),q.y),q.z);}
fn field(p:vec3f)->f32{let t=u.time*u.speed;let n=noise(p*(2.+u.shape.y*3.)+vec3f(t*.22,-t*.17,t*.13));let warp=(n-.5)*u.shape.z*.55;return length(p+vec3f(warp*sin(t+p.y*3.),warp*cos(t+p.x*3.),0))-u.shape.x;}
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn fs(@builtin(position)q:vec4f)->@location(0)vec4f{
 var uv=(q.xy/u.resolution)*2.-1.;uv.x*=u.resolution.x/u.resolution.y;let ro=vec3f(0,0,2.8);let rd=normalize(vec3f(uv,-1.8));var t=0.;var hit=false;var p=ro;
 for(var i=0;i<96;i++){p=ro+rd*t;let d=field(p);if(abs(d)<.002){hit=true;break;}t+=d*.68;if(t>6.){break;}}
 let bg=mix(vec3f(.015,.025,.055),vec3f(.005,.008,.018),length(uv));if(!hit){let aura=exp(-max(0.,length(uv)-.55)*8.)*.06*u.glow.x;return vec4f(bg+aura*u.c1.rgb,1);}
 let e=.004;let n=normalize(vec3f(field(p+vec3f(e,0,0))-field(p-vec3f(e,0,0)),field(p+vec3f(0,e,0))-field(p-vec3f(0,e,0)),field(p+vec3f(0,0,e))-field(p-vec3f(0,0,e))));let fres=pow(1.-max(0.,dot(-rd,n)),2.4);let flow=noise(p*(3.+u.shape.y*4.)+u.time*u.speed*.18);let bands=.5+.5*sin((p.x+p.y*.7-p.z*.4)*9.+flow*8.+u.time*u.speed);
 let col=mix(u.c1.rgb,u.c2.rgb,smoothstep(.15,.85,flow));let inner=mix(col,u.c3.rgb,bands*.62);let spec=pow(max(0.,dot(reflect(rd,n),normalize(vec3f(-.4,.7,.5)))),48.)*1.5;var glass=mix(inner*.35,inner, fres)+fres*.8+spec;glass+=u.glass.z*vec3f(fres*.2,0,fres*.35);return vec4f(glass,1);
}`;
