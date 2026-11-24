const V='chat-v1',SHELL=['chat.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('chat.html'))));
});
self.addEventListener('push',e=>{
 let d={};try{d=e.data.json()}catch(_){d={title:'ข้อความใหม่',body:e.data?e.data.text():''}}
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
  if(cs.some(c=>c.visibilityState==='visible'&&c.focused))return;   // เปิดแอปอยู่หน้าจอ ไม่ต้องเด้ง
  return self.registration.showNotification(d.title||'ข้อความใหม่',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag,renotify:true,data:{chat:d.chat}});
 }));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();const chat=e.notification.data&&e.notification.data.chat;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
  if(cs[0]){cs[0].focus();cs[0].postMessage({openChat:chat});return}
  return self.clients.openWindow('chat.html'+(chat?'#'+encodeURIComponent(chat):''));
 }));
});
