/**
 * Shared teacher-chat styling.
 *
 * The chat appears in two places — the dashboard's slide-in panel (topic
 * creation) and the study view's docked left rail (tutoring the current topic).
 * The two differ only in how the panel is positioned; the inner conversation
 * (message log, bubbles, streaming caret, the "authoring…" chip, the composer)
 * looks and behaves identically. Those position-independent styles live here so
 * the two surfaces can't drift apart. Each consumer supplies its own shell CSS
 * (fixed slide-in vs. grid column) and appends this.
 */
export const CHAT_CSS = `
.chathd{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--border)}
.chatwho{display:flex;align-items:center;gap:10px;min-width:0}
.chatavatar{width:34px;height:34px;flex:0 0 auto;object-fit:contain;border-radius:50%;background:var(--surface-sunken);
padding:2px;box-shadow:var(--shadow-glow)}
.chateyebrow{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:600}
.chatx{background:none;border:none;font-size:22px;line-height:1;color:var(--text-faint);cursor:pointer;padding:0 4px;text-decoration:none}
.chatlog{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.msg{display:flex}.msg.me{justify-content:flex-end}
.bubble{max-width:82%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;
white-space:pre-wrap;overflow-wrap:anywhere}
.msg.bot .bubble{background:var(--surface-sunken);color:var(--text-strong);border-bottom-left-radius:4px}
.msg.me .bubble{background:var(--accent);color:var(--accent-contrast);border-bottom-right-radius:4px}
.bubble .hint{display:block;margin-top:4px;color:var(--text-faint);font-size:12px}
.bubble.streaming .txt:after{content:"▋";margin-left:1px;color:var(--accent);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:0}}
/* "Teacher is working" bubble — shown from send until the reply starts streaming.
   A pose-per-state mascot stands beside the bubble; its src is swapped by iteacherThinking. */
.msg.thinking{align-items:flex-end;gap:9px}
.msg.thinking .tmascot{width:46px;height:46px;flex:0 0 auto;object-fit:contain}
.msg.thinking .bubble{display:flex;align-items:center;gap:8px;color:var(--text-muted)}
.msg.thinking .tlabel{font-size:12.5px;font-style:italic}
.authoring{display:flex;align-items:center;gap:8px;margin-top:9px;padding-top:9px;border-top:1px solid var(--border);
font-size:12px;color:var(--accent);font-weight:600}
.authoring.done{color:var(--status-done)}
/* The thumbs-up mascot that replaces the checkmark once lessons are authored. */
.authoring .doneart{width:24px;height:24px;flex:0 0 auto;object-fit:contain}
.dots{display:inline-flex;gap:3px}
.dots i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pulse 1s infinite}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.chatform{display:flex;gap:8px;padding:14px;border-top:1px solid var(--border);align-items:flex-end}
.chatform textarea{flex:1;resize:none;max-height:120px;border:1px solid var(--border);border-radius:12px;
padding:10px 12px;font-family:var(--font-ui);font-size:13.5px;line-height:1.4;color:var(--text-strong);background:var(--surface)}
.chatform textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--shadow-glow)}
.send{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:none;background:var(--accent);
color:var(--accent-contrast);font-size:18px;cursor:pointer}
.send:disabled{opacity:.45;cursor:default}
/* Dictation: a secondary round button that turns the mic into text via the
   browser's built-in SpeechRecognition. Hidden entirely when unsupported
   (see CHAT_MIC_JS), so it never shows a dead control. */
.mic{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:1px solid var(--border);
background:var(--surface);color:var(--text-muted);cursor:pointer;display:inline-flex;
align-items:center;justify-content:center;padding:0}
.mic:hover:not(:disabled){color:var(--accent);border-color:var(--accent)}
.mic:disabled{opacity:.45;cursor:default}
.mic svg{width:17px;height:17px;display:block}
.mic.rec{color:#fff;background:var(--error);border-color:transparent;animation:micpulse 1.4s ease-in-out infinite}
@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 var(--error)}50%{box-shadow:0 0 0 5px transparent}}
/* Rendered-markdown assistant text: real paragraphs, headings, lists, emphasis. */
.bubble .txt{white-space:normal;display:block}
.bubble .txt>*:first-child{margin-top:0}
.bubble .txt>*:last-child{margin-bottom:0}
.bubble .txt p{margin:0 0 8px}
.bubble .txt h3,.bubble .txt h4,.bubble .txt h5,.bubble .txt h6{margin:12px 0 6px;font-weight:700;line-height:1.25}
.bubble .txt h3{font-size:15px}.bubble .txt h4{font-size:14px}.bubble .txt h5,.bubble .txt h6{font-size:13.5px}
.bubble .txt ul,.bubble .txt ol{margin:6px 0;padding-left:20px}
.bubble .txt li{margin:3px 0}
.bubble .txt strong{font-weight:700}.bubble .txt em{font-style:italic}
.bubble .txt a{color:var(--accent);text-decoration:underline}
.bubble .txt code{background:var(--surface);border:1px solid var(--border);border-radius:4px;
padding:0 4px;font-family:var(--font-mono);font-size:.88em}
/* ── Reduced motion ───────────────────────────────────────────────────────
   Shared by every chat-bearing surface, so this is also the app-wide global
   branch: looping/decorative motion settles to its end state after one
   near-instant cycle instead of running forever or freezing mid-frame.
   The caret and thinking-dots carry live "the teacher is working" state, so
   they must stay *visible* — we only stop them looping, never hide them. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .bubble.streaming .txt:after{animation:none;opacity:1}
  .dots i{animation:none;opacity:.75;transform:none}
}
`;

/**
 * A tiny, dependency-free markdown → HTML renderer, shared by both chats so the
 * teacher's replies read as prose (paragraphs, headings, lists, **bold**, *italic*,
 * `code`, links) instead of raw asterisks. It escapes first, then builds the HTML
 * itself, so the streamed agent text can never inject live markup. Re-run on every
 * streamed delta — messages are short, and a half-typed `**` just shows briefly.
 *
 * Written as browser-ready ES5 (no backtick literals in the source, so it can live
 * in a template string), exposing `window.iteacherMd(text) → htmlString`.
 */
export const CHAT_MD_JS = `(function(){
  var BT=String.fromCharCode(96); // backtick, avoided as a literal here
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function inline(s){
    s=esc(s);
    s=s.replace(new RegExp(BT+'([^'+BT+']+)'+BT,'g'),'<code>$1</code>');
    s=s.replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>');
    s=s.replace(/__([^_]+)__/g,'<strong>$1</strong>');
    s=s.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^)\\s]+)\\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    s=s.replace(/(^|[^*])\\*([^*\\n]+)\\*/g,'$1<em>$2</em>');
    s=s.replace(/(^|[^_a-zA-Z0-9])_([^_\\n]+)_/g,'$1<em>$2</em>');
    return s;
  }
  function md(src){
    var lines=String(src==null?'':src).replace(/\\r\\n?/g,'\\n').split('\\n');
    var html='', para=[], listType=null, items=[];
    function flushPara(){ if(para.length){ html+='<p>'+para.map(inline).join('<br>')+'</p>'; para=[]; } }
    function flushList(){ if(listType){ html+='<'+listType+'>'+items.map(function(t){return '<li>'+inline(t)+'</li>';}).join('')+'</'+listType+'>'; listType=null; items=[]; } }
    for(var i=0;i<lines.length;i++){
      var line=lines[i];
      if(line.replace(/\\s+/g,'')===''){ flushPara(); flushList(); continue; }
      var h=/^(#{1,6})\\s+(.*)$/.exec(line);
      if(h){ flushPara(); flushList(); var lvl=Math.min(h[1].length+2,6); html+='<h'+lvl+'>'+inline(h[2])+'</h'+lvl+'>'; continue; }
      var ul=/^\\s*[-*+]\\s+(.*)$/.exec(line);
      if(ul){ flushPara(); if(listType&&listType!=='ul')flushList(); listType='ul'; items.push(ul[1]); continue; }
      var ol=/^\\s*\\d+[.)]\\s+(.*)$/.exec(line);
      if(ol){ flushPara(); if(listType&&listType!=='ol')flushList(); listType='ol'; items.push(ol[1]); continue; }
      flushList(); para.push(line);
    }
    flushPara(); flushList();
    return html;
  }
  window.iteacherMd=md;
})();`;

/**
 * The shared "teacher is working" indicator. Between the user's send and the
 * first streamed token the agent can spend a long stretch thinking or running
 * tools, and until now the only signal was a disabled composer — the user
 * couldn't tell anything was happening. This shows an animated-dots bot bubble
 * the moment a turn starts and renames itself as tool events arrive
 * ("reading…", "writing…"), so the wait is always narrated. Same ES5-in-a-
 * template-string style as CHAT_MD_JS; exposes `window.iteacherThinking`.
 */
/**
 * Speak-instead-of-type dictation for the composer, using the browser's built-in
 * SpeechRecognition — no dependency, no server audio handling, no model to ship.
 * Self-wiring: finds the `#chatmic` button and `#chatinput` textarea, and if the
 * API is missing it hides the button so no dead control is ever shown. While
 * listening, live (interim + final) transcript is appended after whatever the
 * learner had already typed; a second click, sending, or losing focus stops it.
 *
 * Same ES5-in-a-template-string style as the other chat modules. Include after
 * the composer markup exists in the DOM.
 */
export const CHAT_MIC_JS = `(function(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var btn=document.getElementById('chatmic'), input=document.getElementById('chatinput');
  if(!btn||!input)return;
  if(!SR){ btn.remove(); return; }
  var rec=null, listening=false, base='';
  function setListening(v){
    listening=v; btn.classList.toggle('rec',v); btn.setAttribute('aria-pressed',v?'true':'false');
    btn.title=v?'Stop dictation':'Speak your message';
    if(!v){ rec=null; try{input.focus();}catch(e){} }
  }
  function stop(){ if(rec){ try{rec.stop();}catch(e){} } }
  function start(){
    if(input.disabled)return;
    rec=new SR();
    try{ rec.lang=navigator.language||'en-US'; }catch(e){}
    rec.interimResults=true; rec.continuous=true;
    base=input.value?input.value.replace(/\\s*$/,'')+' ':'';
    rec.onresult=function(e){
      var t='';
      for(var i=0;i<e.results.length;i++){ t+=e.results[i][0].transcript; }
      input.value=base+t;
      try{ input.dispatchEvent(new Event('input',{bubbles:true})); }catch(err){}
    };
    rec.onerror=function(){ setListening(false); };
    rec.onend=function(){ setListening(false); };
    try{ rec.start(); setListening(true); }catch(e){ setListening(false); }
  }
  btn.addEventListener('click',function(){ if(listening)stop(); else start(); });
  // Sending clears the box, so stop listening on submit to avoid re-filling it.
  var form=btn.form||input.form; if(form)form.addEventListener('submit',stop);
})();`;

export const CHAT_THINKING_JS = `(function(){
  var node=null, txt=null, mascot=null;
  // Each state pairs a caption with a mascot pose (assets/<pose>.png): reading a
  // book, jotting on a clipboard, ideating under a lightbulb, teaching with a
  // raised finger, or the default contemplative point.
  function stateFor(name){
    if(name==='Write'||name==='Edit'||name==='NotebookEdit')return ['writing\\u2026','planning'];
    if(name==='Read'||name==='Grep'||name==='Glob')return ['reading\\u2026','reading'];
    if(name==='TodoWrite')return ['planning\\u2026','ideating'];
    return ['working\\u2026','teaching'];
  }
  window.iteacherThinking={
    show:function(log,label,pose){
      if(!log)return;
      if(!node){
        node=document.createElement('div'); node.className='msg bot thinking';
        mascot=document.createElement('img'); mascot.className='tmascot'; mascot.alt=''; mascot.setAttribute('aria-hidden','true');
        var b=document.createElement('div'); b.className='bubble';
        b.innerHTML='<span class="dots"><i></i><i></i><i></i></span>';
        txt=document.createElement('span'); txt.className='tlabel';
        b.appendChild(txt); node.appendChild(mascot); node.appendChild(b);
      }
      mascot.src='/assets/'+(pose||'thinking')+'.png';
      txt.textContent=label||'Thinking\\u2026';
      log.appendChild(node); log.scrollTop=log.scrollHeight;
    },
    tool:function(log,name){ var s=stateFor(name); this.show(log,s[0],s[1]); },
    hide:function(){ if(node&&node.parentNode)node.parentNode.removeChild(node); }
  };
})();`;
