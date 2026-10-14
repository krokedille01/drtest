/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/@web3modal/standalone@2.4.3/dist/index.es.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import{ModalCtrl as o,ThemeCtrl as i,ConfigCtrl as s,OptionsCtrl as l}from"./web3modal-core.js";var c=Object.defineProperty,n=Object.getOwnPropertySymbols,b=Object.prototype.hasOwnProperty,d=Object.prototype.propertyIsEnumerable,a=(r,e,t)=>e in r?c(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t,m=(r,e)=>{for(var t in e||(e={}))b.call(e,t)&&a(r,t,e[t]);if(n)for(var t of n(e))d.call(e,t)&&a(r,t,e[t]);return r};class p{constructor(e){this.openModal=o.open,this.closeModal=o.close,this.subscribeModal=o.subscribe,this.setTheme=i.setThemeConfig,i.setThemeConfig(e),s.setConfig(m({enableStandaloneMode:!0},e)),this.initUi()}async initUi(){if(typeof window<"u"){await import("./web3modal-ui.js");const e=document.createElement("w3m-modal");document.body.insertAdjacentElement("beforeend",e),l.setIsUiLoaded(!0)}}}export{p as Web3Modal};
//# sourceMappingURL=/sm/dec9c53d81af0f117ee288e4ffbcc8d5a0a07d93005d498b7a01b3a6e68ececa.map