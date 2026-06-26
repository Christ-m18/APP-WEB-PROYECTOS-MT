import{c as u,i as n,k as c,d as r,l as i,n as y,o as l,p as f,r as P}from"./index-D3teQMrx.js";/**
 * @license lucide-react v0.390.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=u("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]),s=["proyectos"];function h(){return n({queryKey:s,queryFn:f})}function m(o){return n({queryKey:["proyectos",o],queryFn:()=>P(o),enabled:!!o})}function K(){const o=c();return r({mutationFn:({proyecto:e,partidas:t})=>i(e,t),onSuccess:()=>{o.invalidateQueries({queryKey:s})}})}function Q(){const o=c();return r({mutationFn:({id:e,proyecto:t,partidas:a})=>y(e,t,a),onSuccess:e=>{e!=null&&e.id&&o.setQueryData(["proyectos",e.id],e),o.invalidateQueries({queryKey:s,exact:!0,refetchType:"active"})}})}function b(){const o=c();return r({mutationFn:e=>l(e),onSuccess:()=>{o.invalidateQueries({queryKey:s})}})}const k=[{label:"Trifásico / Bifásico 12.47/7.2 kV",value:"trifasico_bifasico"},{label:"Monofásico 7.2 kV",value:"monofasico"}];export{v as P,k as V,m as a,K as b,Q as c,b as d,h as u};
