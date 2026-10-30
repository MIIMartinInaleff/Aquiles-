// Arma el bloque CLAVE de Mis Cuentas (jose/index.html) a partir de la contraseña.
// La contraseña NUNCA va en el repo: se pasa por variable de entorno.
// Uso: JOSE_PW='...' node jose/clave.js            → imprime  const CLAVE={...};
//      JOSE_PW='...' node jose/clave.js datos.json → además imprime  const SEMILLA={...};  (datos cifrados, solo para vistas previas fuera del repo)
const {webcrypto:C}=require("crypto"),fs=require("fs");
const pw=process.env.JOSE_PW;if(!pw){console.error("Falta JOSE_PW");process.exit(1)}
const b64=u=>Buffer.from(u).toString("base64"),IT=310000;
(async()=>{
 const salt=C.getRandomValues(new Uint8Array(16));
 const k0=await C.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
 const k=await C.subtle.deriveKey({name:"PBKDF2",salt,iterations:IT,hash:"SHA-256"},k0,{name:"AES-GCM",length:256},false,["encrypt"]);
 const enc=async t=>{const n=C.getRandomValues(new Uint8Array(12));return{n:b64(n),c:b64(await C.subtle.encrypt({name:"AES-GCM",iv:n},k,new TextEncoder().encode(t)))}};
 console.log("const CLAVE="+JSON.stringify({s:b64(salt),i:IT,...await enc("ok")})+";");
 if(process.argv[2])console.log("const SEMILLA="+JSON.stringify(await enc(fs.readFileSync(process.argv[2],"utf8")))+";");
})();
