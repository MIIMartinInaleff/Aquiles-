# Arma index.html (en la raíz del repo) a partir de src/app.js, src/style.html y src/logos.html.
# Uso: python3 src/build.py
import os,sys,re,json,base64
d=os.path.dirname(os.path.abspath(__file__))+"/"
root=os.path.dirname(d.rstrip("/"))+"/"
out=sys.argv[1] if len(sys.argv)>1 else root+"index.html"
if os.environ.get("AWG_PW") and os.path.exists(d+"data.json"):
    # re-cifrar los datos iniciales (data.json NUNCA se sube al repo)
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    pw=os.environ["AWG_PW"].encode(); data=open(d+"data.json","rb").read()
    salt=os.urandom(16); nonce=os.urandom(12); IT=310000
    key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=IT).derive(pw)
    ct=AESGCM(key).encrypt(nonce,data,None)
    b64=lambda x:base64.b64encode(x).decode()
    enc=json.dumps({"s":b64(salt),"n":b64(nonce),"i":IT,"c":b64(ct)})
else:
    # reutilizar el bloque cifrado del index.html actual
    m=re.search(r"const ENC=(\{.*?\});",open(root+"index.html").read())
    enc=m.group(1)
style=open(d+"style.html").read(); app=open(d+"app.js").read()
login_css='''<style>
.login{min-height:100vh;display:grid;place-items:center;padding:24px 16px}
.login-card{width:min(400px,100%);background:var(--card);border:1px solid var(--line);border-radius:24px;padding:32px 28px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.login-card .mark{width:52px;height:52px;font-size:26px;margin-bottom:18px}
.login-card h1{font-size:28px;margin:0 0 6px}
.login-card p{color:var(--muted);margin:0 0 22px}
.login-card .input{border-radius:999px;padding:14px 20px;font-size:17px}
.login-err{color:var(--late);font-size:14px;font-weight:600;min-height:20px;margin:10px 0 4px}
</style>'''
html=f'''<!doctype html>
<html lang="es" data-skin="oro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Aquiles World Gym</title>
{open(d+"logos.html").read()}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Manrope:wght@400;500;600;700;800&display=swap">
{style}
{login_css}
</head>
<body>
<div class="login" id="login"><form class="login-card" id="lf" autocomplete="on">
 <img src="" id="llogo" alt="Aquiles World Gym" style="display:block;width:220px;max-width:70%;margin:0 auto 18px"><p style="text-align:center">Ingresá la contraseña para entrar al sistema.</p>
 <label for="pw" class="lbl">Contraseña</label><input class="input" id="pw" type="password" autocomplete="current-password" required>
 <div class="login-err" id="lerr" role="alert"></div>
 <button class="btn big" type="submit" id="lbtn">Entrar</button></form></div>
<div class="app" id="appw" hidden><aside class="side" id="side"></aside><main id="main"></main></div>
<nav class="mbar" id="mbar" hidden></nav>
<div id="modal"></div><div id="toastw"></div>
<script src="lib/supabase.min.js"></script>
<script>
/* Los datos de los socios están cifrados (AES-GCM). Sin la contraseña no se pueden leer. */
document.getElementById("llogo").src=window.__logoFull;
const ENC={enc};
const SB_URL="https://xbujsjsavlvsriiwqajv.supabase.co",SB_KEY="sb_publishable_dtF1D0BitTNQYNRWXEBh4Q__ENTmpzQ",SB_MAIL="martininaleff011@gmail.com";
const u8=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
async function abrir(pw){{const k0=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
 const k=await crypto.subtle.deriveKey({{name:"PBKDF2",salt:u8(ENC.s),iterations:ENC.i,hash:"SHA-256"}},k0,{{name:"AES-GCM",length:256}},false,["decrypt"]);
 const p=await crypto.subtle.decrypt({{name:"AES-GCM",iv:u8(ENC.n)}},k,u8(ENC.c));return JSON.parse(new TextDecoder().decode(p))}}
document.getElementById("lf").onsubmit=async e=>{{e.preventDefault();const b=document.getElementById("lbtn"),er=document.getElementById("lerr");b.disabled=true;b.textContent="Abriendo…";er.textContent="";
 const pw=document.getElementById("pw").value;let D;
 try{{D=await abrir(pw)}}catch(x){{er.textContent="Contraseña incorrecta.";b.disabled=false;b.textContent="Entrar";document.getElementById("pw").select();return}}
 try{{b.textContent="Conectando…";const sb=supabase.createClient(SB_URL,SB_KEY);
  const r=await sb.auth.signInWithPassword({{email:SB_MAIL,password:pw}});if(r.error)throw r.error;
  b.textContent="Cargando datos…";let rows=[];for(let i=0;;i+=1000){{const q=await sb.from("registros").select("col,id,data").order("col").order("id").range(i,i+999);if(q.error)throw q.error;rows=rows.concat(q.data);if(q.data.length<1000)break}}
  window.__sb=sb;window.__rows=rows}}
 catch(x){{console.error(x);er.innerHTML="No se pudo conectar con la base de datos. Revisá internet y probá de nuevo.<br><small style='color:var(--muted);font-weight:500'>Detalle: "+String((x&&(x.message||x.error_description))||x).replace(/[<>&]/g,"")+"</small>";b.disabled=false;b.textContent="Entrar";return}}
 document.getElementById("login").remove();document.getElementById("appw").hidden=false;document.getElementById("mbar").hidden=false;boot(D)}};
function boot(DATA){{
{app}
}}
</script>
</body>
</html>
'''
open(out,"w").write(html); print("ok",len(html))
