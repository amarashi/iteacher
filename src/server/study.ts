/**
 * The split "study" view — a lesson beside its teacher.
 *
 * The dashboard used to open a lesson as a full-page navigation, which left the
 * teacher behind. This shell keeps them together: a persistent teacher-chat rail
 * on the left, the lesson itself in an iframe on the right, and a slim bar with
 * ← Dashboard / progress / Mark complete / Prev · Next. Moving lesson→lesson swaps
 * only the iframe `src`, so the conversation with the teacher survives — the whole
 * point of "let me keep talking to my teacher while I do the lesson".
 *
 * The lesson is served embedded (`/w/:topic/lessons/x.html?embed=1`), so it still
 * gets the progress bridge but not its own top bar (this shell draws the chrome).
 * The chat is wired to a per-topic **tutor** session (see `agent.startTutorSession`).
 */

import type { TopicModel } from "../store/types.js";
import { esc, attr, journeyLabel } from "./html.js";
import { TOKENS_CSS } from "./tokens.js";
import { CHAT_CSS, CHAT_MD_JS, CHAT_THINKING_JS } from "./chat.js";

/** Render the study shell for `topic`, opened on lesson `currentFile`. */
export function renderStudy(topic: TopicModel, currentFile: string): string {
  const idx = Math.max(
    0,
    topic.lessons.findIndex((l) => l.file === currentFile),
  );
  const lessons = topic.lessons.map((l) => ({ file: l.file, title: l.title, state: l.state }));
  const firstSrc = embedUrl(topic.slug, currentFile);
  const bootstrap = {
    slug: topic.slug,
    plannedTotal: topic.journey.plannedTotal,
    startIndex: idx,
    lessons,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(topic.title)} · iTeacher</title>
<style>${STUDY_CSS}</style>
</head>
<body>
<div class="study">
  <aside class="teacher">
    <div class="chathd">
      <span class="chateyebrow">✦ Your teacher</span>
      <a class="chatx" href="/" title="Back to dashboard" aria-label="Back to dashboard">×</a>
    </div>
    <div class="chatlog" id="chatlog">
      <div class="msg bot" id="joining"><div class="bubble">Connecting you to your teacher…</div></div>
    </div>
    <form class="chatform" onsubmit="return studySend(event)">
      <textarea id="chatinput" rows="1" placeholder="Ask your teacher about this lesson…" autocomplete="off"></textarea>
      <button class="send" type="submit" aria-label="Send">→</button>
    </form>
  </aside>
  <main class="stage">
    <div class="stagebar">
      <a class="back" href="/">← Dashboard</a>
      <div class="stagemeta">
        <span class="topic">${esc(topic.title)}</span>
        <span class="sep">·</span>
        <span class="lesson" id="lessonTitle"></span>
        <span class="progress" id="progress"></span>
      </div>
      <button class="navbtn" type="button" id="prev" onclick="studyGo(studyIndex-1)">← Prev</button>
      <button class="complete" type="button" id="complete" onclick="studyComplete()">Mark complete</button>
      <button class="navbtn primary" type="button" id="next" onclick="studyGo(studyIndex+1)">Next →</button>
    </div>
    <iframe class="frame" id="stage" title="Lesson" src="${attr(firstSrc)}"></iframe>
  </main>
</div>
<script>window.__STUDY__=${jsonForScript(bootstrap)};</script>
<script>${CHAT_MD_JS}</script>
<script>${CHAT_THINKING_JS}</script>
<script>${STUDY_SCRIPT}</script>
</body>
</html>`;
}

/** The embedded-lesson URL the iframe frames — bridge without the doubled bar. */
function embedUrl(slug: string, file: string): string {
  return `/w/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(file)}?embed=1`;
}

/** Serialize a value for safe embedding inside an inline <script> (no `</script>` breakout). */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const STUDY_SCRIPT = `(function(){
  var boot=window.__STUDY__||{lessons:[],slug:'',plannedTotal:0,startIndex:0};
  var L=boot.lessons, SLUG=boot.slug, TOTAL=boot.plannedTotal;
  window.studyIndex=boot.startIndex||0;

  function frame(){ return document.getElementById('stage'); }
  function embedSrc(file){ return '/w/'+encodeURIComponent(SLUG)+'/lessons/'+encodeURIComponent(file)+'?embed=1'; }

  function paint(){
    var i=window.studyIndex, l=L[i]; if(!l)return;
    document.getElementById('lessonTitle').textContent=l.title;
    document.getElementById('progress').textContent=TOTAL>0?('Lesson '+(i+1)+' of ~'+TOTAL):'';
    var prev=document.getElementById('prev'), next=document.getElementById('next');
    prev.disabled=(i<=0); next.disabled=(i>=L.length-1);
    paintComplete();
  }
  function paintComplete(){
    var l=L[window.studyIndex], b=document.getElementById('complete');
    if(l&&l.state==='completed'){ b.textContent='✓ Completed'; b.classList.add('done'); b.disabled=true; }
    else { b.textContent='Mark complete'; b.classList.remove('done'); b.disabled=false; }
  }
  window.studyGo=function(i){
    if(i<0||i>=L.length||i===window.studyIndex&&frame().src)return;
    window.studyIndex=i; frame().src=embedSrc(L[i].file); paint();
  };
  window.studyComplete=function(){
    var f=frame();
    try{ if(f.contentWindow&&f.contentWindow.iteacher&&f.contentWindow.iteacher.complete) f.contentWindow.iteacher.complete(); }catch(e){}
    var l=L[window.studyIndex]; if(l)l.state='completed'; paintComplete();
  };

  // --- teacher tutor chat (per-topic session) ---
  var sid=null, es=null, curBubble=null, curTxt=null, curText='', sending=false;
  function logEl(){ return document.getElementById('chatlog'); }
  function scroll(){ var l=logEl(); if(l)l.scrollTop=l.scrollHeight; }
  function dropJoining(){ var j=document.getElementById('joining'); if(j&&j.parentNode)j.parentNode.removeChild(j); }
  function addUser(text){
    var m=document.createElement('div'); m.className='msg me';
    var b=document.createElement('div'); b.className='bubble'; b.textContent=text;
    m.appendChild(b); logEl().appendChild(m); scroll();
  }
  function newBot(){
    dropJoining(); window.iteacherThinking.hide();
    var m=document.createElement('div'); m.className='msg bot';
    curBubble=document.createElement('div'); curBubble.className='bubble streaming';
    curTxt=document.createElement('span'); curTxt.className='txt';
    curBubble.appendChild(curTxt); m.appendChild(curBubble);
    logEl().appendChild(m); curText=''; scroll();
  }
  function setSending(v){
    sending=v;
    var i=document.getElementById('chatinput'), s=document.querySelector('.send');
    if(i)i.disabled=v; if(s)s.disabled=v; if(!v&&i)i.focus();
  }
  function onTeach(d){
    if(d.type==='text'){ if(!curBubble)newBot(); curText+=d.text; curTxt.innerHTML=window.iteacherMd(curText); scroll(); }
    else if(d.type==='tool'){ if(!curBubble)window.iteacherThinking.tool(logEl(),d.name); }
    else if(d.type==='turn'){ window.iteacherThinking.hide(); if(curBubble){curBubble.classList.remove('streaming');} curBubble=null; setSending(false); }
    else if(d.type==='error'){ if(!curBubble)newBot(); curTxt.innerHTML=window.iteacherMd(curText+'\\n\\n\\u26a0 '+d.message); curBubble.classList.remove('streaming'); curBubble=null; setSending(false); }
  }
  function openStream(){
    if(es)es.close();
    es=new EventSource('/api/teach/'+sid+'/events');
    es.onmessage=function(ev){ var d; try{d=JSON.parse(ev.data);}catch(e){return;} if(d.type==='ready')return; onTeach(d); };
  }
  function startTutor(){
    var l=L[window.studyIndex];
    setSending(true);
    fetch('/api/teach/tutor',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({slug:SLUG, lesson:l?l.title:''})})
      .then(function(r){return r.json();})
      .then(function(j){ if(!j||!j.sessionId){setSending(false);dropJoining();return;} sid=j.sessionId; openStream(); if(j.existing){setSending(false);dropJoining();} })
      .catch(function(){ setSending(false); dropJoining(); });
  }
  window.studySend=function(e){
    if(e&&e.preventDefault)e.preventDefault();
    var i=document.getElementById('chatinput'); var text=(i&&i.value||'').trim();
    if(!text||sending||!sid)return false;
    addUser(text); if(i)i.value=''; setSending(true);
    window.iteacherThinking.show(logEl());
    fetch('/api/teach/'+sid+'/reply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text})})
      .catch(function(){ window.iteacherThinking.hide(); setSending(false); });
    return false;
  };
  document.addEventListener('keydown',function(e){
    if(e.target&&e.target.id==='chatinput'&&e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); window.studySend(e); }
  });

  studyGo(window.studyIndex); paint(); startTutor();
})();`;

const STUDY_CSS =
  TOKENS_CSS +
  `
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:var(--font-ui);background:var(--bg);color:var(--text-strong);-webkit-font-smoothing:antialiased;overflow:hidden}
a{color:var(--link)}a:hover{color:var(--link-hover)}
.study{display:grid;grid-template-columns:min(380px,38vw) 1fr;height:100vh}
.teacher{display:flex;flex-direction:column;min-height:0;background:var(--surface);border-right:1px solid var(--border)}
.stage{display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--bg)}
.stagebar{display:flex;align-items:center;gap:12px;padding:9px 16px;background:var(--surface);
border-bottom:1px solid var(--border);font-size:13px}
.stagebar .back{text-decoration:none;font-weight:600;color:var(--text-muted);white-space:nowrap}
.stagebar .back:hover{color:var(--accent)}
.stagemeta{display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden}
.stagemeta .topic{font-weight:600;color:var(--text-strong);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stagemeta .lesson{color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stagemeta .sep{color:var(--border)}
.stagemeta .progress{margin-left:auto;color:var(--text-faint);font-family:var(--font-mono);font-size:11px;
white-space:nowrap;font-variant-numeric:tabular-nums;padding-left:8px}
.navbtn{border:1px solid var(--border);background:var(--surface);color:var(--text-body);border-radius:var(--radius-md);
padding:7px 12px;font-family:var(--font-ui);font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.navbtn:hover:not(:disabled){background:var(--surface-sunken)}
.navbtn.primary{border-color:transparent;background:var(--accent);color:var(--accent-contrast)}
.navbtn.primary:hover:not(:disabled){background:var(--accent-hover)}
.navbtn:disabled{opacity:.4;cursor:default}
.complete{border:1px solid transparent;background:var(--surface-sunken);color:var(--text-body);border-radius:var(--radius-md);
padding:7px 14px;font-weight:600;font-size:12.5px;cursor:pointer;white-space:nowrap;border-color:var(--border)}
.complete:hover:not(:disabled){background:var(--surface)}
.complete.done{background:var(--status-done);color:#fff;border-color:transparent;cursor:default}
.frame{flex:1;border:0;width:100%;background:#fff}
@media(max-width:820px){
  .study{grid-template-columns:1fr;grid-template-rows:38vh 1fr}
  .teacher{border-right:0;border-bottom:1px solid var(--border)}
  .stagebar{flex-wrap:wrap}
  .stagemeta{order:3;flex-basis:100%}
}
` +
  CHAT_CSS;
