"use strict";var x=Object.defineProperty;var I=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var V=Object.prototype.hasOwnProperty;var O=(p,e)=>{for(var t in e)x(p,t,{get:e[t],enumerable:!0})},R=(p,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of N(e))!V.call(p,a)&&a!==t&&x(p,a,{get:()=>e[a],enumerable:!(s=I(e,a))||s.enumerable});return p};var U=p=>R(x({},"__esModule",{value:!0}),p);var j={};O(j,{default:()=>E});module.exports=U(j);var b=require("obsidian");var F=require("child_process"),T=require("obsidian"),B=5e3,k=class{constructor(e){this.settings=e;this._baseUrl=`http://${e.apiHost}:${e.apiPort}`}proc=null;alive=!1;_baseUrl;exitCallbacks=[];stderrLog="";get ready(){return this.alive}get baseUrl(){return this._baseUrl}get stderr(){return this.stderrLog}updateSettings(e){this.settings=e,this._baseUrl=`http://${e.apiHost}:${e.apiPort}`}start(e,t,s){if(this.proc&&this.alive)return;let a=["serve","--http","--port",String(this.settings.apiPort),"--host",this.settings.apiHost,"--auth-token",e,"--workers","1","--cors-origin","app://obsidian.md","--cors-origin","app://local.obsidian.md"],i={};if(t&&(i.DEEPSEEK_API_KEY=t),this.settings.environmentVariables?.trim())for(let n of this.settings.environmentVariables.split(`
`)){let r=n.trim();if(!r||r.startsWith("#"))continue;let l=r.indexOf("=");l!==-1&&(i[r.slice(0,l).trim()]=r.slice(l+1).trim())}let o=this.settings.deepseekPath;console.log("[DeepSeek] Starting:",o,a.join(" "),"cwd:",s??"(default)"),this.stderrLog="";try{this.proc=(0,F.spawn)(o,a,{stdio:["pipe","pipe","pipe"],env:{...process.env,...i},windowsHide:!0,cwd:s})}catch(n){let r=n instanceof Error?n.message:String(n);console.error("[DeepSeek] Failed to spawn:",r),new T.Notice("Failed to start DeepSeek: "+r),this.alive=!1;return}this.proc.on("error",n=>{console.error("[DeepSeek] Process error:",n.message),this.stderrLog+="[error] "+n.message+`
`,this.alive=!1,new T.Notice("DeepSeek process error: "+n.message)}),this.proc.on("exit",(n,r)=>{let l=r?`signal ${r}`:`code ${n}`;console.log("[DeepSeek] Process exited with",l),this.stderrLog+=`[exited with ${l}]
`,this.alive=!1;for(let u of this.exitCallbacks)u(n);this.exitCallbacks=[]}),this.proc.stderr&&this.proc.stderr.on("data",n=>{let r=n.toString("utf-8");this.stderrLog+=r,console.log("[DeepSeek stderr]",r)}),this.proc.stdout&&this.proc.stdout.on("data",n=>{console.log("[DeepSeek stdout]",n.toString("utf-8"))}),this.alive=!0,console.log("[DeepSeek] Process spawned, PID:",this.proc.pid)}onExit(e){this.exitCallbacks.push(e)}async stop(){if(!(!this.proc||!this.alive))return new Promise(e=>{let t=()=>{clearTimeout(s),e()};this.proc.once("exit",t),this.proc.kill("SIGTERM");let s=setTimeout(()=>{this.alive&&this.proc&&this.proc.kill("SIGKILL")},B)})}};var v=class{constructor(e){this.settings=e}abortController=null;get baseUrl(){return`http://${this.settings.apiHost}:${this.settings.apiPort}`}async healthCheck(){try{return(await fetch(`${this.baseUrl}/health`)).ok}catch{return!1}}async*streamTurn(e,t){this.abortController=new AbortController;let s;try{s=await fetch(`${this.baseUrl}/v1/stream`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({prompt:e.prompt,model:e.model,mode:e.mode}),signal:this.abortController.signal})}catch(r){if(r instanceof DOMException&&r.name==="AbortError"){yield{type:"done"};return}yield{type:"error",message:`Connection failed: ${r instanceof Error?r.message:String(r)}`};return}if(!s.ok||!s.body){let r=await s.text().catch(()=>"Unknown error");yield{type:"error",message:`HTTP ${s.status}: ${r}`};return}let a=s.body.getReader(),i=new TextDecoder,o="",n="";try{for(;;){let{done:r,value:l}=await a.read();if(r)break;o+=i.decode(l,{stream:!0});let u=o.split(`
`);o=u.pop()||"";for(let m of u){let g=m.trim();if(g!==""){if(g.startsWith("event: ")){n=g.slice(7).trim();continue}if(g.startsWith("data: ")){let C=g.slice(6).trim();if(C==="{}"||C===""){n==="done"&&(yield{type:"done"});continue}let f=JSON.parse(C);switch(n){case"turn.started":yield{type:"turn_started",data:f};break;case"message.delta":f.thinking?yield{type:"thinking_delta",data:f}:yield{type:"message_delta",data:f};break;case"turn.completed":yield{type:"turn_completed",data:f};break}}}}}}finally{a.releaseLock()}}async sendPrompt(e,t){let s="",a;for await(let i of this.streamTurn(e,t))i.type==="message_delta"&&i.data&&"content"in i.data?s+=i.data.content:i.type==="turn_completed"&&i.data&&"usage"in i.data?a=i.data.usage:i.type==="error"&&(s+=`
Error: ${i.message}`);return{output:s,usage:a}}cancel(){this.abortController?.abort()}async listSessions(){try{let e=await fetch(`${this.baseUrl}/v1/sessions`);return e.ok?await e.json():{sessions:[]}}catch{return{sessions:[]}}}async listThreads(){try{let e=await fetch(`${this.baseUrl}/v1/threads`);return e.ok?await e.json():[]}catch{return[]}}};var _=require("obsidian"),d="deepseek-chat-view",H=[{value:"deepseek-v4-pro",label:"V4 Pro"},{value:"deepseek-v4-flash",label:"V4 Flash"},{value:"deepseek-chat",label:"Chat"}],w=class extends _.ItemView{plugin;messages=[];messagesEl;inputEl;sendBtn;cancelBtn;statusEl;isGenerating=!1;streamingMsgEl=null;thinkingEl=null;modelSelect;constructor(e,t){super(e),this.plugin=t}getViewType(){return d}getDisplayText(){return"DeepSeek TUI"}getIcon(){return"deepseek-whale"}async onOpen(){let e=this.containerEl.children[1];e.empty(),e.addClass("deepseek-chat-container");let t=e.createDiv("deepseek-chat-header");t.createSpan("deepseek-chat-title").setText("DeepSeek TUI"),this.modelSelect=t.createEl("select","deepseek-model-select");for(let o of H){let n=this.modelSelect.createEl("option");n.value=o.value,n.textContent=o.label}this.modelSelect.value=this.plugin.settings.defaultModel,this.statusEl=t.createSpan("deepseek-status"),this.statusEl.setText("Disconnected"),this.statusEl.addClass("status-disconnected"),this.messagesEl=e.createDiv("deepseek-chat-messages");let s=e.createDiv("deepseek-kb-toolbar");s.createEl("button",{text:"Ingest New",cls:"deepseek-kb-btn"}).addEventListener("click",()=>this.plugin.kbIngestRecentFile()),s.createEl("button",{text:"Vault Map",cls:"deepseek-kb-btn"}).addEventListener("click",()=>this.plugin.kbCompileVault()),s.createEl("button",{text:"Search",cls:"deepseek-kb-btn"}).addEventListener("click",()=>this.plugin.kbQueryVault()),s.createEl("button",{text:"Lint Vault",cls:"deepseek-kb-btn"}).addEventListener("click",()=>this.plugin.kbLintCurrentFile());let a=e.createDiv("deepseek-chat-input-area");this.inputEl=a.createEl("textarea","deepseek-chat-input"),this.inputEl.placeholder="Ask DeepSeek... (Enter to send, Shift+Enter for newline)";let i=a.createDiv("deepseek-btn-row");this.sendBtn=i.createEl("button",{text:"Send",cls:"deepseek-send-btn"}),this.cancelBtn=i.createEl("button",{text:"Cancel",cls:"deepseek-cancel-btn"}),this.cancelBtn.style.display="none",this.sendBtn.addEventListener("click",()=>{this.handleSend()}),this.inputEl.addEventListener("keydown",o=>{o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),this.handleSend())}),this.cancelBtn.addEventListener("click",()=>this.plugin.handleCancel()),this.checkServerHealth()}async onClose(){this.messages=[],this.messagesEl?.empty()}setConnected(e){this.statusEl.setText(e?"Ready":"Disconnected"),this.statusEl.removeClass("status-disconnected"),this.statusEl.removeClass("status-ready"),this.statusEl.removeClass("status-generating"),this.statusEl.addClass(e?"status-ready":"status-disconnected")}async checkServerHealth(){let e=await this.plugin.apiClient.healthCheck();this.setConnected(e)}setGenerating(e){this.isGenerating=e,this.cancelBtn.style.display=e?"":"none",e&&(this.statusEl.setText("Generating..."),this.statusEl.addClass("status-generating"))}handleSSEEvent(e,t){switch(e.type){case"turn_started":this.setGenerating(!0),e.data&&"model"in e.data&&this.statusEl.setText(`Generating (${e.data.model})...`);break;case"message_delta":e.data&&"content"in e.data&&this.appendStreaming(e.data.content,!1);break;case"thinking_delta":e.data&&"content"in e.data&&this.appendStreaming(e.data.content,!0);break;case"turn_completed":e.data&&"usage"in e.data&&this.finalizeStreaming(e.data),this.setGenerating(!1),this.statusEl.setText("Ready"),this.statusEl.removeClass("status-generating");break;case"done":this.setGenerating(!1),this.statusEl.setText("Ready"),this.statusEl.removeClass("status-generating");break;case"error":this.showError(e.message||"Unknown error"),this.setGenerating(!1);break}}addUserMessage(e){this.messages.push({id:crypto.randomUUID(),role:"user",content:e,thinking:"",isStreaming:!1,timestamp:Date.now()}),this.renderAllMessages()}addSystemMessage(e){this.messages.push({id:crypto.randomUUID(),role:"system",content:e,thinking:"",isStreaming:!1,timestamp:Date.now()}),this.renderAllMessages()}addAssistantMessage(e){this.messages.push({id:crypto.randomUUID(),role:"assistant",content:e,thinking:"",isStreaming:!1,timestamp:Date.now(),usage:void 0}),this.renderAllMessages()}addAssistantPlaceholder(){let e={id:crypto.randomUUID(),role:"assistant",content:"",thinking:"",isStreaming:!0,timestamp:Date.now()};this.messages.push(e),this.renderAllMessages();let t=this.messagesEl.querySelectorAll(".deepseek-msg-assistant"),s=t[t.length-1];s&&(this.streamingMsgEl=s.querySelector(".deepseek-msg-content"),this.thinkingEl=s.querySelector(".deepseek-thinking"))}getSelectedModel(){return this.modelSelect?.value??this.plugin.settings.defaultModel}appendStreaming(e,t){let s=this.messages[this.messages.length-1];!s||s.role!=="assistant"||(t?(s.thinking+=e,this.thinkingEl&&(this.thinkingEl.setText(s.thinking),this.thinkingEl.style.display=s.thinking?"":"none")):(s.content+=e,this.streamingMsgEl&&this.streamingMsgEl.setText(s.content)),this.messagesEl.scrollTop=this.messagesEl.scrollHeight)}finalizeStreaming(e){let t=this.messages[this.messages.length-1];t&&t.role==="assistant"&&(t.isStreaming=!1,t.usage={inputTokens:e.usage.input_tokens,outputTokens:e.usage.output_tokens}),this.streamingMsgEl=null,this.thinkingEl=null,this.renderAllMessages()}showError(e){this.messages.push({id:crypto.randomUUID(),role:"system",content:`Error: ${e}`,thinking:"",isStreaming:!1,timestamp:Date.now()}),this.renderAllMessages()}async handleSend(){let e=this.inputEl.value.trim();e&&(this.inputEl.value="",!this.tryKbCommand(e)&&this.plugin.handleSendMessage(e))}tryKbCommand(e){let t=e.toLowerCase();if(t.startsWith("ingest")||t.startsWith("\u6444\u5165")||t.startsWith("\u5206\u6790")){let s=e.replace(/^(ingest|摄入|分析)\s*/i,"").trim();return!s||s==="\u5F53\u524D"||s==="current"?this.plugin.kbIngestCurrentFile():s.includes("\u6700\u8FD1")||s.includes("recent")||s.includes("\u6700\u65B0")?this.plugin.kbIngestRecentFile():this.plugin.kbIngestFileByName(s),!0}if(t.startsWith("compile")||t.startsWith("\u6574\u7406")||t.startsWith("\u7F16\u8BD1"))return this.plugin.kbCompileVault(),!0;if(t.startsWith("query")||t.startsWith("\u67E5\u8BE2")||t.startsWith("\u641C\u7D22")||t.startsWith("\u67E5\u627E")){let s=e.replace(/^(query|查询|搜索|查找)\s*/i,"").trim();return s?this.plugin.kbQueryChat(s):this.plugin.kbQueryVault(),!0}return t.startsWith("lint")||t.startsWith("\u68C0\u67E5")||t.startsWith("\u7EA0\u9519")?(this.plugin.kbLintCurrentFile(),!0):!1}renderAllMessages(){this.messagesEl.empty();for(let e of this.messages){if(e.role==="system"){this.messagesEl.createDiv("deepseek-msg deepseek-msg-system").setText(e.content);continue}let t=this.messagesEl.createDiv(`deepseek-msg deepseek-msg-${e.role}`),s=t.createDiv("deepseek-msg-header");if(s.createSpan("deepseek-msg-role").setText(e.role==="user"?"You":"DeepSeek"),e.usage&&s.createSpan("deepseek-msg-usage").setText(`${e.usage.inputTokens} in / ${e.usage.outputTokens} out`),e.thinking){let i=t.createDiv("deepseek-thinking");i.setText(e.thinking),e.isStreaming&&i.addClass("streaming")}let a=t.createDiv("deepseek-msg-content");a.setText(e.content),e.isStreaming&&a.addClass("streaming")}this.messagesEl.scrollTop=this.messagesEl.scrollHeight}};var c=require("obsidian"),y=class{plugin;constructor(e){this.plugin=e}getAuthToken(){return this.plugin.authToken??""}async ensureServer(){this.plugin.processManager.ready||this.plugin.startServer();for(let e=0;e<30;e++){if(await this.plugin.apiClient.healthCheck())return!0;await new Promise(t=>setTimeout(t,500))}return new c.Notice("DeepSeek server is not responding. Check the binary path in Settings."),!1}async ingestFile(e){if(!e){new c.Notice("No file selected.");return}if(!await this.ensureServer())return;let t=this.plugin.app.vault.getAbstractFileByPath(e);if(!t){new c.Notice(`File not found: ${e}`);return}let s=await this.plugin.app.vault.read(t),a=this.extractFrontmatter(s);new c.Notice(`Ingesting: ${t.name}...`);let i=`You are a knowledge base ingestion tool. Analyze the following Obsidian note and produce a structured summary.

## Instructions
1. Extract the main topic and 3-5 key points
2. Suggest 3-5 relevant tags (using #tag format)
3. Generate backlinks to potentially related concepts
4. If the note has frontmatter, suggest improvements

## Note Content
---
Title: ${t.basename}
Frontmatter: ${JSON.stringify(a)}
---
${s.slice(0,8e3)}

## Output Format
Return a JSON object:
{
  "summary": "one paragraph summary",
  "tags": ["#tag1", "#tag2"],
  "keyPoints": ["point 1", "point 2"],
  "suggestedLinks": ["[[Note A]]", "[[Note B]]"],
  "frontmatterSuggestions": "optional suggestions"
}`;try{let o=await this.plugin.apiClient.sendPrompt({prompt:i,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),n=this.parseJsonFromOutput(o.output);n?new $(this.plugin.app,{fileName:t.name,summary:n.summary??"No summary generated",tags:n.tags??[],keyPoints:n.keyPoints??[],suggestedLinks:n.suggestedLinks??[]}).open():(new c.Notice("Ingestion complete. See console for details."),console.log("Ingest result:",o.output))}catch(o){new c.Notice(`Ingestion failed: ${o instanceof Error?o.message:"Unknown error"}`)}}async compileVault(){if(!await this.ensureServer())return;let e=this.plugin.app.vault.getMarkdownFiles();if(e.length===0){new c.Notice("No markdown files in vault.");return}new c.Notice(`Compiling ${e.length} notes...`);let s=`You are a vault compiler tool. Based on the following file listing from an Obsidian vault, generate a knowledge graph overview.

## File Listing
${e.slice(0,200).map((a,i)=>`${i+1}. [[${a.basename}]] (${a.path})`).join(`
`)}

## Instructions
1. Group files into 3-5 thematic clusters
2. For each cluster, describe the common theme
3. Identify orphan notes (notes that seem disconnected)
4. Suggest a vault organization structure

## Output Format
Return a JSON object:
{
  "clusters": [
    {"theme": "theme name", "files": ["[[Note1]]", "[[Note2]]"], "description": "..."}
  ],
  "orphans": ["[[OrphanNote1]]"],
  "organizationSuggestions": "text suggestions"
}`;try{let a=await this.plugin.apiClient.sendPrompt({prompt:s,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),i=this.parseJsonFromOutput(a.output);i?new P(this.plugin.app,i).open():(new c.Notice("Compilation complete. See console for details."),console.log("Compile result:",a.output))}catch(a){new c.Notice(`Compilation failed: ${a instanceof Error?a.message:"Unknown error"}`)}}async queryVault(){if(!await this.ensureServer())return;new D(this.plugin.app,async t=>{if(!t.trim()){new c.Notice("Query cannot be empty.");return}new c.Notice("Searching vault...");let s=this.plugin.app.vault.getMarkdownFiles(),a=t.toLowerCase(),i=s.filter(r=>r.basename.toLowerCase().includes(a)||r.path.toLowerCase().includes(a)).slice(0,10),o="";for(let r of i){let l=await this.plugin.app.vault.read(r);o+=`
### ${r.basename}
${l.slice(0,2e3)}
`}let n=`You are a knowledge base query tool. Answer the user's question based on the following notes from their Obsidian vault.

## Vault Context
${o||"(No directly matching files found; use your best knowledge)"}

## User Query
${t}

## Instructions
1. Answer the query using the provided context when possible
2. Cite specific notes using [[Note Name]] format
3. If context is insufficient, say so and provide general guidance
4. Suggest related notes to explore`;try{let r=await this.plugin.apiClient.sendPrompt({prompt:n,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken());new M(this.plugin.app,t,r.output).open()}catch(r){new c.Notice(`Query failed: ${r instanceof Error?r.message:"Unknown error"}`)}}).open()}async lintFile(e){if(!e){new c.Notice("No file selected.");return}if(!await this.ensureServer())return;let t=this.plugin.app.vault.getAbstractFileByPath(e);if(!t){new c.Notice(`File not found: ${e}`);return}let s=await this.plugin.app.vault.read(t);new c.Notice(`Linting: ${t.name}...`);let a=`You are a markdown linter for Obsidian notes. Review the following note and identify issues.

## Note Content
${s.slice(0,8e3)}

## Check For
1. Broken wiki links [[like this]] that reference non-existent notes
2. Missing or malformed frontmatter
3. Inconsistent heading hierarchy
4. Empty sections or placeholders
5. Spelling/grammar issues (flag likely problems)
6. Missing alt text on images
7. Opportunities for internal linking

## Output Format
Return a JSON object:
{
  "issues": [
    {"severity": "warning|error|info", "line": 1, "message": "description", "suggestion": "fix suggestion"}
  ],
  "stats": {"totalIssues": 0, "errors": 0, "warnings": 0, "info": 0},
  "summary": "brief summary"
}`;try{let i=await this.plugin.apiClient.sendPrompt({prompt:a,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),o=this.parseJsonFromOutput(i.output);o?.issues?new L(this.plugin.app,t.name,o).open():(new c.Notice("Lint complete. See console."),console.log("Lint result:",i.output))}catch(i){new c.Notice(`Lint failed: ${i instanceof Error?i.message:"Unknown error"}`)}}extractFrontmatter(e){let t=e.match(/^---\n([\s\S]*?)\n---/);if(!t)return{};let s={};for(let a of t[1].split(`
`)){let i=a.indexOf(":");if(i===-1)continue;let o=a.slice(0,i).trim(),n=a.slice(i+1).trim();typeof n=="string"&&n.startsWith("[")&&n.endsWith("]")&&(n=n.slice(1,-1).split(",").map(r=>r.trim().replace(/^["']|["']$/g,""))),o&&(s[o]=n)}return s}async ingestFileForChat(e){let t=this.plugin.app.vault.getAbstractFileByPath(e);if(!t)return`File not found: ${e}`;let s=await this.plugin.app.vault.read(t),a=this.extractFrontmatter(s),i=`You are a knowledge base ingestion tool. Analyze the following Obsidian note and produce a structured summary.

## Instructions
1. Extract the main topic and 3-5 key points
2. Suggest 3-5 relevant tags (using #tag format)
3. Generate backlinks to potentially related concepts
4. If the note has frontmatter, suggest improvements

## Note Content
---
Title: ${t.basename}
Frontmatter: ${JSON.stringify(a)}
---
${s.slice(0,8e3)}

## Output Format
Return a JSON object with keys: summary, tags, keyPoints, suggestedLinks, frontmatterSuggestions`;try{let o=await this.plugin.apiClient.sendPrompt({prompt:i,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),n=this.parseJsonFromOutput(o.output);if(!n)return o.output;let r=`## Ingest: ${t.name}

`;return r+=`**Summary:** ${n.summary??"N/A"}

`,n.keyPoints?.length&&(r+=`### Key Points
${n.keyPoints.map(l=>`- ${l}`).join(`
`)}

`),n.tags?.length&&(r+=`**Tags:** ${n.tags.join(" ")}

`),n.suggestedLinks?.length&&(r+=`**Suggested Links:** ${n.suggestedLinks.join(", ")}

`),n.frontmatterSuggestions&&(r+=`**Frontmatter:** ${n.frontmatterSuggestions}`),r}catch(o){return`Ingest failed: ${o instanceof Error?o.message:"Unknown error"}`}}async compileVaultForChat(){let e=this.plugin.app.vault.getMarkdownFiles();if(e.length===0)return"No markdown files in vault.";let s=`You are a vault compiler tool. Based on the file listing, generate a knowledge graph overview.

## File Listing
${e.slice(0,200).map((a,i)=>`${i+1}. [[${a.basename}]]`).join(`
`)}

## Output Format
Return JSON: { clusters: [{theme, files, description}], orphans: [...], organizationSuggestions: "..." }`;try{let a=await this.plugin.apiClient.sendPrompt({prompt:s,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),i=this.parseJsonFromOutput(a.output);if(!i)return a.output;let o=`## Vault Overview (${e.length} notes)

`,n=i.clusters;if(n)for(let r of n){o+=`### ${r.theme}
${r.description}
`;let l=r.files;l?.length&&(o+=l.map(u=>`- ${u}`).join(`
`)+`
`),o+=`
`}return i.organizationSuggestions&&(o+=`### Suggestions
${i.organizationSuggestions}`),o}catch(a){return`Compile failed: ${a instanceof Error?a.message:"Unknown error"}`}}async queryVaultForChat(e){let t=this.plugin.app.vault.getMarkdownFiles(),s=e.toLowerCase(),a=t.filter(n=>n.basename.toLowerCase().includes(s)||n.path.toLowerCase().includes(s)).slice(0,10),i="";for(let n of a){let r=await this.plugin.app.vault.read(n);i+=`
### ${n.basename}
${r.slice(0,2e3)}
`}let o=`Answer the user's query based on vault notes.

## Vault Context
${i||"(No directly matching files)"}

## Query
${e}

Cite notes using [[Note Name]] format. Suggest related notes.`;try{return(await this.plugin.apiClient.sendPrompt({prompt:o,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken())).output}catch(n){return`Query failed: ${n instanceof Error?n.message:"Unknown error"}`}}async lintFileForChat(e){let t=this.plugin.app.vault.getAbstractFileByPath(e);if(!t)return`File not found: ${e}`;let s=await this.plugin.app.vault.read(t),a=`You are a markdown linter. Review this note and identify issues.

## Note: ${t.basename}
${s.slice(0,8e3)}

Check: broken wiki links, malformed frontmatter, heading hierarchy, empty sections, spelling/grammar.

Return JSON: { issues: [{severity, line, message, suggestion}], stats: {totalIssues, errors, warnings, info} }`;try{let i=await this.plugin.apiClient.sendPrompt({prompt:a,model:this.plugin.settings.defaultModel,mode:"plan"},this.getAuthToken()),o=this.parseJsonFromOutput(i.output);if(!o?.issues)return i.output;let n=`## Lint: ${t.name}

`,r=o.stats;r&&(n+=`| Errors | Warnings | Info |
|--------|----------|------|
`,n+=`| ${r.errors??0} | ${r.warnings??0} | ${r.info??0} |

`);let l=o.issues;for(let u of l){let m=u.severity==="error"?"\u274C":u.severity==="warning"?"\u26A0\uFE0F":"\u2139\uFE0F";n+=`- ${m} **L${u.line}**: ${u.message}`,u.suggestion&&(n+=` \u2192 ${u.suggestion}`),n+=`
`}return l.length||(n+="\u2705 No issues found."),n}catch(i){return`Lint failed: ${i instanceof Error?i.message:"Unknown error"}`}}parseJsonFromOutput(e){try{return JSON.parse(e)}catch{let t=e.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);if(t)try{return JSON.parse(t[1])}catch{}let s=e.match(/\{[\s\S]*\}/);if(s)try{return JSON.parse(s[0])}catch{}return null}}},$=class extends c.Modal{result;constructor(e,t){super(e),this.result=t}onOpen(){let{contentEl:e}=this;e.addClass("deepseek-modal"),e.createEl("h2",{text:`\u{1F4E5} ${this.result.fileName}`}),e.createEl("h3",{text:"Summary"}),e.createEl("p",{text:this.result.summary}),e.createEl("h3",{text:"Key Points"});let t=e.createEl("ul");for(let s of this.result.keyPoints)t.createEl("li",{text:s});if(e.createEl("h3",{text:"Tags"}),e.createEl("p",{text:this.result.tags.join(" ")}),this.result.suggestedLinks.length>0){e.createEl("h3",{text:"Suggested Links"});let s=e.createEl("ul");for(let a of this.result.suggestedLinks)s.createEl("li",{text:a})}}onClose(){this.contentEl.empty()}},P=class extends c.Modal{result;constructor(e,t){super(e),this.result=t}onOpen(){let{contentEl:e}=this;e.addClass("deepseek-modal"),e.createEl("h2",{text:"\u{1F4CA} Vault Overview"});let t=this.result.clusters;if(t)for(let a of t){let i=e.createDiv("deepseek-cluster");i.createEl("h3",{text:`\u{1F4C1} ${a.theme}`}),i.createEl("p",{text:a.description});let o=a.files;if(o?.length){let n=i.createEl("ul");for(let r of o)n.createEl("li",{text:r})}}let s=this.result.organizationSuggestions;s&&(e.createEl("h3",{text:"Suggestions"}),e.createEl("p",{text:s}))}onClose(){this.contentEl.empty()}},D=class extends c.Modal{onSubmit;constructor(e,t){super(e),this.onSubmit=t}onOpen(){let{contentEl:e}=this;e.addClass("deepseek-modal"),e.createEl("h2",{text:"\u{1F50D} Query Vault"}),e.createEl("p",{text:"Ask a question about your vault content."});let t=e.createEl("textarea","deepseek-query-input");t.placeholder="e.g., What are the key findings from my research notes?",e.createDiv("deepseek-btn-row").createEl("button",{text:"Search"}).addEventListener("click",()=>{this.onSubmit(t.value),this.close()}),t.addEventListener("keydown",i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),this.onSubmit(t.value),this.close())}),t.focus()}onClose(){this.contentEl.empty()}},M=class extends c.Modal{query;result;constructor(e,t,s){super(e),this.query=t,this.result=s}onOpen(){let{contentEl:e}=this;e.addClass("deepseek-modal"),e.createEl("h2",{text:"\u{1F50D} Query Results"}),e.createEl("em",{text:`Q: ${this.query}`}),e.createEl("hr"),e.createDiv("deepseek-query-result").setText(this.result)}onClose(){this.contentEl.empty()}},L=class extends c.Modal{fileName;result;constructor(e,t,s){super(e),this.fileName=t,this.result=s}onOpen(){let{contentEl:e}=this;e.addClass("deepseek-modal"),e.createEl("h2",{text:`\u{1F50D} Lint: ${this.fileName}`});let t=this.result.stats;if(t){let a=e.createDiv("deepseek-lint-stats");a.createEl("span",{text:`Issues: ${t.totalIssues} `}),a.createEl("span",{text:`\u{1F534} ${t.errors}  `,cls:"deepseek-severity-error"}),a.createEl("span",{text:`\u{1F7E1} ${t.warnings}  `,cls:"deepseek-severity-warning"}),a.createEl("span",{text:`\u2139\uFE0F ${t.info}`,cls:"deepseek-severity-info"})}let s=this.result.issues;if(s?.length){let a=e.createEl("ul","deepseek-lint-list");for(let i of s){let o=a.createEl("li",`deepseek-lint-item deepseek-severity-${i.severity}`);o.createEl("strong",{text:`L${i.line}: `}),o.createEl("span",{text:i.message}),i.suggestion&&(o.createEl("br"),o.createEl("em",{text:`\u{1F4A1} ${i.suggestion}`}))}}else e.createEl("p",{text:"\u2705 No issues found."})}onClose(){this.contentEl.empty()}};var h=require("obsidian"),K={"deepseek-v4-pro":"V4 Pro (powerful)","deepseek-v4-flash":"V4 Flash (fast)","deepseek-chat":"Chat","deepseek-reasoner":"Reasoner",auto:"Auto (adaptive)"},q={off:"Off \u2014 no thinking",high:"High \u2014 balanced",max:"Max \u2014 deepest"},S=class extends h.PluginSettingTab{plugin;constructor(e,t){super(e,t),this.plugin=t}display(){let{containerEl:e}=this;e.empty(),e.addClass("deepseek-settings"),e.createEl("h2",{text:"DeepSeek TUI Settings"}),new h.Setting(e).setName("DeepSeek binary path").setDesc("Full path to deepseek.exe").addText(o=>o.setPlaceholder("deepseek").setValue(this.plugin.settings.deepseekPath).onChange(async n=>{this.plugin.settings.deepseekPath=n.trim(),await this.plugin.saveSettings()})),new h.Setting(e).setName("API port").setDesc("Port for the HTTP API server (default: 7878)").addText(o=>o.setPlaceholder("7878").setValue(String(this.plugin.settings.apiPort)).onChange(async n=>{let r=parseInt(n,10);!isNaN(r)&&r>0&&r<65536&&(this.plugin.settings.apiPort=r,await this.plugin.saveSettings())})),new h.Setting(e).setName("Default model").setDesc("Model for chat and knowledge base operations").addDropdown(o=>{for(let[n,r]of Object.entries(K))o.addOption(n,r);o.setValue(this.plugin.settings.defaultModel).onChange(async n=>{this.plugin.settings.defaultModel=n,await this.plugin.saveSettings()})}),new h.Setting(e).setName("Reasoning effort").setDesc("Controls how deeply the model thinks before responding").addDropdown(o=>{for(let[n,r]of Object.entries(q))o.addOption(n,r);o.setValue(this.plugin.settings.reasoningEffort).onChange(async n=>{this.plugin.settings.reasoningEffort=n,await this.plugin.saveSettings()})}),new h.Setting(e).setName("Auto-start server").setDesc("Start the HTTP server when the plugin loads").addToggle(o=>o.setValue(this.plugin.settings.autoStartServer).onChange(async n=>{this.plugin.settings.autoStartServer=n,await this.plugin.saveSettings()})),new h.Setting(e).setName("Environment variables").setDesc("Set DEEPSEEK_API_KEY and other env vars (one per line, KEY=VALUE)").addTextArea(o=>{o.setPlaceholder(`DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com/beta`).setValue(this.plugin.settings.environmentVariables).onChange(async n=>{this.plugin.settings.environmentVariables=n,await this.plugin.saveSettings()}),o.inputEl.rows=4}),e.createEl("h3",{text:"Server Control"});let t=e.createDiv("deepseek-server-controls"),s=t.createSpan("deepseek-server-status");s.setText(this.plugin.processManager.ready?"Running":"Stopped"),t.createEl("button",{text:"Start"}).addEventListener("click",()=>{this.plugin.startServer(),s.setText("Starting..."),setTimeout(()=>{s.setText(this.plugin.processManager.ready?"Running":"Failed")},2e3)}),t.createEl("button",{text:"Stop"}).addEventListener("click",async()=>{await this.plugin.processManager.stop(),s.setText("Stopped")})}};var A={deepseekPath:"deepseek",apiPort:7878,apiHost:"127.0.0.1",defaultModel:"deepseek-v4-pro",autoStartServer:!0,reasoningEffort:"high",environmentVariables:""};var W=`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 85c-5 0-9-4-9-9V35c0-9 4-16 10-20C57 9 66 5 76 5c5 0 9 4 9 9v41c0 9-4 16-10 20-6 6-15 10-25 10z" fill="currentColor"/>
  <circle cx="60" cy="22" r="4" fill="var(--background-primary)"/>
  <path d="M15 55c-6-3-10-9-10-15s4-12 10-15l20-10c3-1 6 0 6 3v28c0 3-3 5-6 3L15 55z" fill="currentColor"/>
  <path d="M38 38c0 8-4 15-10 15s-10-7-10-15 4-15 10-15 10 7 10 15z" fill="var(--background-primary)"/>
</svg>`,E=class extends b.Plugin{settings;processManager;apiClient;chatView_=null;_authToken="";kb;get authToken(){return this._authToken}async onload(){await this.loadSettings(),this._authToken=this.generateAuthToken(),this.processManager=new k(this.settings),this.apiClient=new v(this.settings),this.kb=new y(this),(0,b.addIcon)("deepseek-whale",W),this.registerView(d,e=>(this.chatView_=new w(e,this),this.chatView_)),this.addRibbonIcon("deepseek-whale","Open DeepSeek TUI",()=>{this.activateView()}),this.addCommand({id:"open-deepseek-chat",name:"Open chat",callback:()=>{this.activateView()}}),this.addCommand({id:"kb-ingest",name:"Knowledge Base: Ingest current file",editorCallback:(e,t)=>{this.kb.ingestFile(t.file?.path??"")}}),this.addCommand({id:"kb-compile",name:"Knowledge Base: Compile vault index",callback:()=>{this.kb.compileVault()}}),this.addCommand({id:"kb-query",name:"Knowledge Base: Query vault",callback:()=>{this.kb.queryVault()}}),this.addCommand({id:"kb-lint",name:"Knowledge Base: Lint current file",editorCallback:(e,t)=>{this.kb.lintFile(t.file?.path??"")}}),this.addSettingTab(new S(this.app,this)),this.settings.autoStartServer&&this.startServer(),console.log("DeepSeek TUI plugin loaded")}async onunload(){await this.processManager.stop(),this.app.workspace.detachLeavesOfType(d)}async loadSettings(){this.settings=Object.assign({},A,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}get vaultPath(){return this.app.vault.adapter.getBasePath?.()??""}startServer(){let e=this.parseApiKey();this.processManager.start(this._authToken,e,this.vaultPath),this.waitForServer()}addChatMessage(e,t){this.chatView_&&(e==="user"?this.chatView_.addUserMessage(t):e==="system"?this.chatView_.addSystemMessage(t):this.chatView_.addAssistantMessage(t))}async handleSendMessage(e,t){if(!this.chatView_)return;if(this.processManager.ready||this.startServer(),!await this.waitForServerAsync(15e3)){this.chatView_?.handleSSEEvent({type:"error",message:"DeepSeek server is not running. Check the binary path in Settings and that port "+this.settings.apiPort+" is free."},()=>{});return}let a=this.app.vault.getName(),i=this.app.vault.getMarkdownFiles().length,o=this.app.workspace.getActiveFile(),n=o?`Obsidian vault: "${a}" (${i} notes). Currently open: "${o.basename}"`:`Obsidian vault: "${a}" (${i} notes).`,r=t?.systemPrompt??"",l=r?`${r}

Vault context: ${n}

Task: ${e}`:`${n}

${e}`;this.chatView_.addUserMessage(e),this.chatView_.addAssistantPlaceholder();let u=this.chatView_.getSelectedModel(),m=t?.mode??"plan";(async()=>{for await(let g of this.apiClient.streamTurn({prompt:l,model:u,mode:m},this._authToken))this.chatView_?.handleSSEEvent(g,()=>this.handleCancel())})().catch(g=>{this.chatView_?.handleSSEEvent({type:"error",message:g.message},()=>{})})}async ensureChatOpen(){if(!this.chatView_){await this.activateView();for(let e=0;e<10&&!this.chatView_;e++)await this.sleep(200)}}get lastIngestTime(){return this.settings._lastIngest??0}set lastIngestTime(e){this.settings._lastIngest=e}async kbIngestRecentFile(){let e=this.app.vault.getMarkdownFiles();if(e.length===0){this.chatView_?.addSystemMessage("No files.");return}let t=this.lastIngestTime,s=t>0?e.filter(r=>(r.stat.mtime??0)>t).sort((r,l)=>(l.stat.mtime??0)-(r.stat.mtime??0)):e.sort((r,l)=>(l.stat.mtime??0)-(r.stat.mtime??0)).slice(0,5);if(s.length===0){this.chatView_?.addSystemMessage("No new files since last ingest.");return}let a="",i=0,o=2e4;for(let r of s){let l=await this.app.vault.read(r),u=`
### ${r.basename}
Path: ${r.path}
${l.slice(0,3e3)}
`;if(i+u.length>o)break;a+=u,i+=u.length}let n=s.slice(0,10).map(r=>r.basename).join(", ");await this.ensureChatOpen(),this.lastIngestTime=Date.now(),this.saveSettings(),this.handleSendMessage(`Ingest ${s.length} files: ${n}`,{mode:"agent",systemPrompt:`You are a knowledge management agent in Obsidian. Ingest these files (${s.length} notes modified since last ingest).

Files to ingest:
${a}

Execute:
1. For each file, extract the main topic and 2-3 key points
2. Identify cross-file themes and connections \u2014 what threads run across these notes?
3. Suggest #tags and [[wikilinks]] that connect these notes to each other
4. Note any frontmatter improvements
5. If these notes represent a project or topic cluster, summarize the big picture
6. Flag any contradictions or gaps between notes

Report your findings clearly. Use [[wikilinks]] and #tags.`})}async kbIngestCurrentFile(){let e=this.app.workspace.getActiveFile();if(!e){this.chatView_?.addSystemMessage("No file open.");return}let t=await this.app.vault.read(e);await this.ensureChatOpen(),this.handleSendMessage(`Ingest: ${e.basename}`,{mode:"agent",systemPrompt:`You are a knowledge management agent. Ingest this note.

File: ${e.basename}
Path: ${e.path}
Content:
${t.slice(0,12e3)}

Execute:
1. Extract main topic, thesis, and 3-5 key arguments
2. Identify implied assumptions and missing context
3. Suggest 3-5 #tags and [[wikilinks]]
4. Note frontmatter improvements
5. Propose 2-3 follow-up questions

Report in chat using [[wikilinks]] and #tags.`})}async kbCompileVault(){let e=this.app.vault.getMarkdownFiles();if(e.length===0){this.chatView_?.addSystemMessage("No files.");return}let t=e.slice(0,200).map((s,a)=>`${a+1}. [[${s.basename}]]`).join(`
`);await this.ensureChatOpen(),this.handleSendMessage(`Compile vault overview (${e.length} notes)`,{mode:"agent",systemPrompt:`You are a knowledge management agent. Survey this Obsidian vault.

Files (top 200):
${t}

Execute:
1. Group notes into 3-6 thematic clusters with descriptions
2. Identify central hub notes that bridge topics
3. Flag orphan notes with no clear home
4. Suggest 3-5 new notes to fill knowledge gaps
5. Recommend an improved folder/tag structure

Report using [[wikilinks]].`})}async kbQueryVault(){await this.kb.queryVault()}async kbLintCurrentFile(){let e=this.app.vault.getMarkdownFiles();if(e.length===0){this.chatView_?.addSystemMessage("No files.");return}let t=Math.min(8,e.length),s=Math.max(1,Math.floor(e.length/t)),a=[];for(let n=0;n<e.length&&a.length<t;n+=s)a.push(e[n]);let i="";for(let n of a){let r=await this.app.vault.read(n);i+=`
### ${n.basename}
${r.slice(0,1500)}
`}let o=e.map((n,r)=>`${r+1}. [[${n.basename}]]`).join(`
`);await this.ensureChatOpen(),this.handleSendMessage(`Lint entire vault (${e.length} notes)`,{mode:"agent",systemPrompt:`You are a vault quality agent. Audit this entire Obsidian vault for issues.

Total notes: ${e.length}
Sampled content from ${a.length} notes for deep inspection:
${i}

Full file listing:
${o.slice(0,6e3)}

Execute:
1. Scan ALL filenames for broken [[wikilinks]] \u2014 cross-reference links against the file listing
2. Check frontmatter quality across the sampled notes \u2014 missing title/date/tags, malformed YAML
3. Identify heading hierarchy problems in sampled notes
4. Find orphan notes with no incoming links (check listing for notes never referenced)
5. Spot style issues: missing frontmatter, bare URLs, empty notes
6. Identify opportunities for better internal linking \u2014 notes that SHOULD link to each other
7. Summarize: top 5 most impactful fixes across the vault

For each issue: severity (error/warning/info), the file, and the fix. Report with [[wikilinks]].`})}async kbIngestFileByName(e){let s=this.app.vault.getMarkdownFiles().find(i=>i.basename.toLowerCase().includes(e.toLowerCase())||i.path.toLowerCase().includes(e.toLowerCase()));if(!s){this.chatView_?.addSystemMessage(`Not found: "${e}"`);return}let a=await this.app.vault.read(s);await this.ensureChatOpen(),this.handleSendMessage(`Ingest: ${s.basename}`,{mode:"agent",systemPrompt:`You are a knowledge management agent. Ingest this note.

File: ${s.basename}
Content:
${a.slice(0,12e3)}

Extract: main topic, key points, #tags, [[wikilinks]], frontmatter improvements, follow-up questions. Report with [[wikilinks]].`})}async kbQueryChat(e){let t=this.app.vault.getMarkdownFiles(),s=e.toLowerCase(),a=t.filter(o=>o.basename.toLowerCase().includes(s)||o.path.toLowerCase().includes(s)).slice(0,10),i="";for(let o of a){let n=await this.app.vault.read(o);i+=`
### ${o.basename}
${n.slice(0,2e3)}
`}await this.ensureChatOpen(),this.handleSendMessage(`Search: ${e}`,{mode:"agent",systemPrompt:`You are a knowledge retrieval agent. Answer using vault content.

Relevant notes:
${i||"(No matching files \u2014 use general knowledge)"}

Query: ${e}

Answer using notes where possible. Cite with [[Note Name]]. Suggest related notes.`})}handleCancel(){this.apiClient.cancel()}async activateView(){let{workspace:e}=this.app,t=e.getLeavesOfType(d);if(t.length>0){e.revealLeaf(t[0]);return}let s=e.getRightLeaf(!1);s&&(await s.setViewState({type:d,active:!0}),e.revealLeaf(s))}waitForServer(){(async()=>{for(let t=0;t<20;t++){if(await this.apiClient.healthCheck()){this.chatView_?.setConnected(!0);return}await this.sleep(500)}this.chatView_?.setConnected(!1)})()}async waitForServerAsync(e){let t=Date.now()+e;for(;Date.now()<t;){if(await this.apiClient.healthCheck())return!0;await this.sleep(500)}return!1}parseApiKey(){let e=this.settings.environmentVariables??"";for(let t of e.split(`
`)){let s=t.trim();if(s.startsWith("DEEPSEEK_API_KEY="))return s.slice(17).trim()}return""}generateAuthToken(){let e="abcdefghijklmnopqrstuvwxyz0123456789",t="";for(let s=0;s<32;s++)t+=e[Math.floor(Math.random()*e.length)];return t}sleep(e){return new Promise(t=>setTimeout(t,e))}};
