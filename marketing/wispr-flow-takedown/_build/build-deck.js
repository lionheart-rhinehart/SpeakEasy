const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = (f) => path.join(__dirname, "..", "images", f);

// ---- palette ----
const INK="0F1222", INDIGO="5B5BF0", VIOLET="7C3AED", TEAL="14B8A6",
      MIST="F6F7FB", SLATE="475069", LINE="E6E8F0", GOOD="10B981", BAD="EF4444",
      GOLD="F5B301", WHITE="FFFFFF", ICE="CADCFC", PANEL="11142A";
const HFONT="Trebuchet MS", BFONT="Calibri";

const shadow = () => ({ type:"outer", color:"000000", blur:9, offset:3, angle:135, opacity:0.16 });

let p = new pptxgen();
p.defineLayout({ name:"W", width:13.333, height:7.5 });
p.layout = "W";
p.author = "SpeakEasy";
p.title = "SpeakEasy vs. Wispr Flow";

const W = 13.333, H = 7.5;

// ---------- helpers ----------
function footer(slide, dark){
  const c = dark ? "8189A8" : "9AA1B5";
  slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.5, y:7.02, w:0.16, h:0.16, fill:{color: dark?TEAL:INDIGO}, rectRadius:0.04, line:{type:"none"} });
  slide.addText("SpeakEasy", { x:0.7, y:6.93, w:3, h:0.35, fontFace:HFONT, fontSize:10, bold:true, color:c, align:"left", valign:"middle", margin:0 });
  slide.addText("Voice that works for you — not just types for you.", { x:8.0, y:6.93, w:4.83, h:0.35, fontFace:BFONT, fontSize:9, italic:true, color:c, align:"right", valign:"middle", margin:0 });
}
function eyebrow(slide, text, dark){
  const w = 0.5 + text.length*0.108;
  slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y:0.55, w, h:0.36, fill:{color: dark?"1E2342":"EFEAFF"}, rectRadius:0.18, line:{type:"none"} });
  slide.addText(text.toUpperCase(), { x:0.7, y:0.55, w, h:0.36, fontFace:HFONT, fontSize:10.5, bold:true, color: dark?"A9B0FF":VIOLET, align:"center", valign:"middle", charSpacing:1.2, margin:0 });
}
function title(slide, runs, y=1.05, dark=false){
  slide.addText(runs, { x:0.7, y, w:12.0, h:1.0, fontFace:HFONT, fontSize:34, bold:true, color: dark?WHITE:INK, align:"left", valign:"middle", margin:0 });
}

// ===================================================================
// SLIDE 1 — TITLE (dark)
// ===================================================================
let s = p.addSlide(); s.background = { color: INK };
s.addShape(p.shapes.OVAL, { x:9.2, y:-2.2, w:6.5, h:6.5, fill:{color:VIOLET, transparency:72}, line:{type:"none"} });
s.addShape(p.shapes.OVAL, { x:10.6, y:3.4, w:5.0, h:5.0, fill:{color:TEAL, transparency:80}, line:{type:"none"} });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.8, y:0.7, w:0.28, h:0.28, fill:{color:TEAL}, rectRadius:0.07, line:{type:"none"} });
s.addText("SpeakEasy", { x:1.15, y:0.62, w:3, h:0.44, fontFace:HFONT, fontSize:15, bold:true, color:WHITE, valign:"middle", margin:0 });
s.addText([
  { text:"Wispr Flow types for you.", options:{ color:ICE, breakLine:true } },
  { text:"SpeakEasy ", options:{ color:WHITE } },
  { text:"works for you.", options:{ color:TEAL } },
], { x:0.8, y:2.0, w:7.0, h:2.4, fontFace:HFONT, fontSize:40, bold:true, lineSpacingMultiple:1.03, align:"left", valign:"top", margin:0 });
s.addText("The voice tool the marketing group is sleeping on — a head-to-head for people who actually want to get work done.",
  { x:0.82, y:4.45, w:6.9, h:1.0, fontFace:BFONT, fontSize:16, color:"AAB0C8", align:"left", valign:"top", margin:0 });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.82, y:5.7, w:4.6, h:0.62, fill:{color:"1B1F3B"}, line:{color:"32385E", width:1}, rectRadius:0.1 });
s.addText([
  { text:"$99 one-time", options:{ color:TEAL, bold:true } },
  { text:"   ·   not $180/yr forever", options:{ color:"CDD3EA" } },
], { x:0.82, y:5.7, w:4.6, h:0.62, fontFace:HFONT, fontSize:14, align:"center", valign:"middle", margin:0 });
s.addImage({ path: IMG("hero-voice-to-stack.png"), x:8.25, y:2.75, w:4.45, h:2.5, sizing:{type:"contain", w:4.45, h:2.5} });

// ===================================================================
// SLIDE 2 — THE HYPE (light) — concede Wispr is good
// ===================================================================
s = p.addSlide(); s.background={color:WHITE};
eyebrow(s,"What everyone's hyped about",false);
title(s,[{text:"Wispr Flow is, honestly, ",options:{color:INK}},{text:"a great dictation app.",options:{color:VIOLET}}]);
const hype = [
  ["$2B","valuation (May 2026)"],
  ["2.5M+","downloads"],
  ["100+","languages"],
  ["~184","words/min dictation"],
];
hype.forEach((d,i)=>{
  const x = 0.7 + i*3.06;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y:2.3, w:2.85, h:1.9, fill:{color:MIST}, line:{color:LINE,width:1}, rectRadius:0.12, shadow:shadow() });
  s.addText(d[0], { x, y:2.5, w:2.85, h:0.95, fontFace:HFONT, fontSize:40, bold:true, color:INDIGO, align:"center", valign:"middle", margin:0 });
  s.addText(d[1], { x, y:3.5, w:2.85, h:0.55, fontFace:BFONT, fontSize:13, color:SLATE, align:"center", valign:"top", margin:0 });
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y:4.7, w:11.93, h:1.55, fill:{color:"F5FFFB"}, line:{color:"D4F3EA",width:1.5}, rectRadius:0.12 });
s.addText([
  { text:"We're not here to trash it.  ", options:{ bold:true, color:INK } },
  { text:"If your job is multilingual dictation on a Mac or phone, Wispr is the better buy — and we'll say so. The question for marketers is different: do you want voice that types, or voice that ", options:{ color:SLATE } },
  { text:"runs your stack?", options:{ bold:true, color:TEAL } },
], { x:1.0, y:4.85, w:11.3, h:1.25, fontFace:BFONT, fontSize:15.5, align:"left", valign:"middle", lineSpacingMultiple:1.05, margin:0 });
footer(s,false);

// ===================================================================
// SLIDE 3 — THE GAP (light) — big zero
// ===================================================================
s = p.addSlide(); s.background={color:WHITE};
eyebrow(s,"The category gap",false);
title(s,[{text:"It only types. ",options:{color:INK}},{text:"That's the whole ceiling.",options:{color:VIOLET}}]);
s.addImage({ path: IMG("comparison-dictation-vs-automation.png"), x:0.7, y:2.25, w:6.7, h:3.77, sizing:{type:"contain", w:6.7, h:3.77} });
// right: the zero stat
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:7.75, y:2.4, w:4.9, h:1.55, fill:{color:"FFF7F7"}, line:{color:"FDE0E0",width:1.5}, rectRadius:0.12, shadow:shadow() });
s.addText("0", { x:7.95, y:2.45, w:1.3, h:1.45, fontFace:HFONT, fontSize:60, bold:true, color:BAD, align:"center", valign:"middle", margin:0 });
s.addText([
  {text:"voice-triggered actions",options:{bold:true, color:INK, breakLine:true}},
  {text:"No webhooks. No custom workflows. No “say it → it happens.”",options:{color:SLATE, fontSize:12}},
], { x:9.2, y:2.5, w:3.3, h:1.4, fontFace:BFONT, fontSize:15, align:"left", valign:"middle", margin:0 });
[
  "No no-code webhooks into Zapier / Make / n8n",
  "No stored AI-prompt actions",
  "No per-action hotkeys or targeted paste",
  "A dev API exists — but you're not coding mid-campaign",
].forEach((t,i)=>{
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:7.75, y:4.2+i*0.49, w:0.13, h:0.13, fill:{color:BAD}, rectRadius:0.03, line:{type:"none"} });
  s.addText(t, { x:7.98, y:4.07+i*0.49, w:4.65, h:0.4, fontFace:BFONT, fontSize:13.5, color:SLATE, valign:"middle", margin:0 });
});
footer(s,false);

// ===================================================================
// SLIDE 4 — WHAT SPEAKEASY DOES (light) — architecture
// ===================================================================
s = p.addSlide(); s.background={color:WHITE};
eyebrow(s,"The difference",false);
title(s,[{text:"Say the name of an action — ",options:{color:INK}},{text:"it runs.",options:{color:TEAL}}]);
// native "command card" (replaces a generated diagram for crisp text)
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y:2.3, w:6.7, h:3.85, fill:{color:INK}, rectRadius:0.14, shadow:shadow() });
s.addShape(p.shapes.OVAL, { x:1.0, y:2.62, w:0.2, h:0.2, fill:{color:TEAL}, line:{type:"none"} });
s.addText("PRESS HOTKEY  ·  SPEAK A NAME", { x:1.28, y:2.5, w:5.9, h:0.4, fontFace:HFONT, fontSize:11, bold:true, color:"AAB0C8", charSpacing:1.5, valign:"middle", margin:0 });
const cmds = [
  ['"Send to my newsletter Zap"', "→  fires a webhook into your stack", INDIGO],
  ['"Rewrite this as a hook"', "→  runs a stored AI prompt", TEAL],
  ['"Open Canva"', "→  launches the right tool", VIOLET],
];
cmds.forEach((c,i)=>{
  const y = 3.12 + i*0.96;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:1.0, y, w:6.1, h:0.82, fill:{color:"1B1F3B"}, line:{color:"2A2F52",width:1}, rectRadius:0.1 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:1.0, y, w:0.1, h:0.82, fill:{color:c[2]}, line:{type:"none"} });
  s.addText(c[0], { x:1.28, y:y+0.08, w:5.7, h:0.42, fontFace:HFONT, fontSize:16, bold:true, italic:true, color:WHITE, valign:"middle", margin:0 });
  s.addText(c[1], { x:1.28, y:y+0.44, w:5.7, h:0.32, fontFace:BFONT, fontSize:12, color:"86E5D6", valign:"middle", margin:0 });
});
const flow = [
  ["Speak","Press one hotkey, say an action's name. Fuzzy-matching finds it."],
  ["Webhook","Fires into Zapier / Make / n8n or any endpoint, response pasted back."],
  ["AI prompt","Runs a stored prompt on your text — Claude, GPT, or OpenRouter."],
  ["Open tool","Launches the right app or URL (even the right Chrome profile)."],
];
flow.forEach((d,i)=>{
  const y = 2.35 + i*0.93;
  s.addShape(p.shapes.OVAL, { x:7.75, y, w:0.62, h:0.62, fill:{color: i===0?INDIGO:TEAL}, line:{type:"none"} });
  s.addText(String(i+1), { x:7.75, y, w:0.62, h:0.62, fontFace:HFONT, fontSize:20, bold:true, color:WHITE, align:"center", valign:"middle", margin:0 });
  s.addText([
    {text:d[0]+"  ",options:{bold:true, color:INK, fontSize:16}},
    {text:"\n"+d[1],options:{color:SLATE, fontSize:12.5}},
  ], { x:8.5, y:y-0.06, w:4.15, h:0.85, fontFace:BFONT, align:"left", valign:"middle", lineSpacingMultiple:0.95, margin:0 });
});
footer(s,false);

// ===================================================================
// SLIDE 5 — FIVE PILLARS (light) grid
// ===================================================================
s = p.addSlide(); s.background={color:MIST};
eyebrow(s,"Why marketers switch",false);
title(s,[{text:"Five reasons it wins",options:{color:INK}}]);
const pillars = [
  ["Voice that DOES things","Trigger webhooks, AI transforms & tools by voice. Wispr can only type.",INDIGO],
  ["Your keys, your money","Bring your own OpenAI key. Dictation runs ~$0.006/min — pennies.",TEAL],
  ["Multi-LLM, not locked","Claude, GPT, or anything on OpenRouter. Wispr is one closed engine.",VIOLET],
  ["Power-user control","Per-action hotkeys, Cursor Lock, Chrome-profile routing on Windows.",INDIGO],
  ["Own it, don't rent it","One license key, yours to keep. No subscription that dies when you stop.",TEAL],
  ["No surveillance scandal","Clean privacy record. (Wispr was caught sending audio + screenshots in 2025.)",VIOLET],
];
pillars.forEach((d,i)=>{
  const col=i%3, row=Math.floor(i/3);
  const x=0.7+col*4.06, y=2.25+row*2.15;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w:3.85, h:1.95, fill:{color:WHITE}, line:{color:LINE,width:1}, rectRadius:0.1, shadow:shadow() });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:x+0.25, y:y+0.25, w:0.5, h:0.5, fill:{color:d[2]}, rectRadius:0.12, line:{type:"none"} });
  s.addText(String(i+1), { x:x+0.25, y:y+0.25, w:0.5, h:0.5, fontFace:HFONT, fontSize:18, bold:true, color:WHITE, align:"center", valign:"middle", margin:0 });
  s.addText(d[0], { x:x+0.9, y:y+0.22, w:2.8, h:0.6, fontFace:HFONT, fontSize:15.5, bold:true, color:INK, valign:"middle", margin:0 });
  s.addText(d[1], { x:x+0.27, y:y+0.92, w:3.35, h:0.9, fontFace:BFONT, fontSize:12.5, color:SLATE, valign:"top", lineSpacingMultiple:0.98, margin:0 });
});
footer(s,false);

// ===================================================================
// SLIDE 6 — HEAD TO HEAD MATRIX (light)
// ===================================================================
s = p.addSlide(); s.background={color:WHITE};
eyebrow(s,"Head to head",false);
title(s,[{text:"We concede what Wispr does better.",options:{color:INK}}]);
const rows = [
  ["Voice commands (say an action → it runs)","Yes",GOOD,"None",BAD],
  ["No-code webhooks (Zapier / Make / n8n)","Unlimited",GOOD,"None",BAD],
  ["Stored AI-prompt actions","Yes",GOOD,"None",BAD],
  ["Multi-LLM (Claude / GPT / OpenRouter)","Yes",GOOD,"Closed",BAD],
  ["Per-action hotkeys + Cursor Lock","Yes",GOOD,"No",BAD],
  ["Pricing model","$99 one-time",GOOD,"$180/yr forever",SLATE],
  ["Languages","~13",SLATE,"100+ (wins)",GOLD],
  ["Mac / iOS / Android","Windows only",BAD,"All (wins)",GOLD],
  ["Learned dictionary / auto-format","On demand",SLATE,"Refined (wins)",GOLD],
  ["Privacy track record","Clean",GOOD,"2025 incident",GOLD],
];
// native grid (addTable proved fragile — draw rows as shapes for full control)
const colX=[0.92, 7.78, 10.32], colW=[6.7,2.4,2.4], rowH=0.41, top=2.05;
s.addShape(p.shapes.RECTANGLE, { x:0.7, y:top, w:11.93, h:0.46, fill:{color:INK}, line:{type:"none"} });
s.addText("Capability", { x:colX[0], y:top, w:colW[0], h:0.46, fontFace:HFONT, fontSize:13, bold:true, color:WHITE, valign:"middle", margin:0 });
s.addText("SpeakEasy", { x:colX[1], y:top, w:colW[1], h:0.46, fontFace:HFONT, fontSize:13, bold:true, color:"C9B8FF", valign:"middle", margin:0 });
s.addText("Wispr Flow", { x:colX[2], y:top, w:colW[2], h:0.46, fontFace:HFONT, fontSize:13, bold:true, color:"AAB0C8", valign:"middle", margin:0 });
let yy = top+0.46;
rows.forEach((r,i)=>{
  const bg = i%2 ? "FBFBFE" : "FFFFFF";
  s.addShape(p.shapes.RECTANGLE, { x:0.7, y:yy, w:11.93, h:rowH, fill:{color:bg}, line:{color:LINE, width:0.5} });
  s.addText(r[0], { x:colX[0], y:yy, w:colW[0], h:rowH, fontFace:BFONT, fontSize:12.5, color:INK, valign:"middle", margin:0 });
  s.addText(r[1], { x:colX[1], y:yy, w:colW[1], h:rowH, fontFace:BFONT, fontSize:12.5, bold:true, color:r[2], valign:"middle", margin:0 });
  s.addText(r[3], { x:colX[2], y:yy, w:colW[2], h:rowH, fontFace:BFONT, fontSize:12.5, bold:true, color:r[4], valign:"middle", margin:0 });
  yy += rowH;
});
footer(s,false);

// ===================================================================
// SLIDE 7 — THE COST MATH (dark) — chart
// ===================================================================
s = p.addSlide(); s.background={color:INK};
eyebrow(s,"The kill shot",true);
title(s,[{text:"Run the numbers. ",options:{color:WHITE}},{text:"It isn't close.",options:{color:TEAL}}],1.05,true);
s.addText("3-year total cost by usage level — SpeakEasy ($99 once + your usage) vs. Wispr ($180/yr).",
  { x:0.7, y:1.95, w:12, h:0.4, fontFace:BFONT, fontSize:13.5, color:"AAB0C8", valign:"top", margin:0 });
s.addChart(p.charts.BAR, [
  { name:"SpeakEasy (3-yr)", labels:["Light (5k/wk)","Medium (20k/wk)","Heavy (50k/wk)"], values:[134,238,448] },
  { name:"Wispr Flow (3-yr)", labels:["Light (5k/wk)","Medium (20k/wk)","Heavy (50k/wk)"], values:[540,540,540] },
], {
  x:0.6, y:2.5, w:7.7, h:4.0, barDir:"col", barGrouping:"clustered",
  chartColors:[TEAL, VIOLET],
  chartArea:{ fill:{color:INK} }, plotArea:{ fill:{color:INK} },
  catAxisLabelColor:"CDD3EA", valAxisLabelColor:"8189A8", catAxisLabelFontSize:11, valAxisLabelFontSize:10,
  valGridLine:{ color:"2A2F52", size:0.5 }, catGridLine:{ style:"none" },
  valAxisMinVal:0, valAxisMaxVal:600,
  showValue:true, dataLabelPosition:"outEnd", dataLabelColor:"FFFFFF", dataLabelFontSize:10, dataLabelFontBold:true,
  showLegend:true, legendPos:"t", legendColor:"CDD3EA", legendFontSize:11,
});
// right callouts
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:8.65, y:2.6, w:4.0, h:1.75, fill:{color:PANEL}, line:{color:"2A2F52",width:1}, rectRadius:0.12 });
s.addText("Medium user saves", { x:8.85, y:2.72, w:3.6, h:0.4, fontFace:BFONT, fontSize:13, color:"AAB0C8", margin:0 });
s.addText("~$300", { x:8.85, y:3.05, w:3.6, h:0.85, fontFace:HFONT, fontSize:48, bold:true, color:TEAL, margin:0 });
s.addText("over 3 years — pays for itself in ~9 months.", { x:8.85, y:3.9, w:3.6, h:0.4, fontFace:BFONT, fontSize:12, color:"CDD3EA", margin:0 });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:8.65, y:4.5, w:4.0, h:1.95, fill:{color:"161A33"}, line:{color:"2A2F52",width:1}, rectRadius:0.12 });
s.addText("The honest part", { x:8.85, y:4.62, w:3.6, h:0.4, fontFace:HFONT, fontSize:13, bold:true, color:GOLD, margin:0 });
s.addText("At extreme volume (5+ hrs of talking/week), Whisper minutes narrow the gap — the live calculator shows that too. That candor is the sell.",
  { x:8.85, y:4.98, w:3.6, h:1.4, fontFace:BFONT, fontSize:12, color:"AAB0C8", valign:"top", lineSpacingMultiple:1.02, margin:0 });
footer(s,true);

// ===================================================================
// SLIDE 8 — PRIVACY / TRUST (light)
// ===================================================================
s = p.addSlide(); s.background={color:WHITE};
eyebrow(s,"Big ≠ on your side",false);
title(s,[{text:"Scale cuts both ways.",options:{color:INK}}]);
// Wispr card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y:2.25, w:5.85, h:3.9, fill:{color:"FFF7F7"}, line:{color:"FDE0E0",width:1.5}, rectRadius:0.14, shadow:shadow() });
s.addText([{text:"⚠  ",options:{color:BAD}},{text:"Wispr Flow — 2025, reported",options:{bold:true,color:INK}}],
  { x:1.0, y:2.5, w:5.3, h:0.5, fontFace:HFONT, fontSize:18, valign:"middle", margin:0 });
s.addText("A developer found the app capturing screenshots of your active window and sending audio to third-party cloud infrastructure. Wispr's first move was to ban the researcher who reported it — the CTO apologized only later.",
  { x:1.0, y:3.1, w:5.25, h:1.7, fontFace:BFONT, fontSize:14, color:SLATE, valign:"top", lineSpacingMultiple:1.05, margin:0 });
s.addText("Privacy Mode was added after — but users can't independently verify it.",
  { x:1.0, y:5.25, w:5.25, h:0.7, fontFace:BFONT, fontSize:13, italic:true, color:"9A4A4A", valign:"top", margin:0 });
// SpeakEasy card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:6.78, y:2.25, w:5.85, h:3.9, fill:{color:"F5FFFB"}, line:{color:"D4F3EA",width:1.5}, rectRadius:0.14, shadow:shadow() });
s.addText([{text:"\u{1F6E1}  ",options:{color:TEAL}},{text:"SpeakEasy",options:{bold:true,color:INK}}],
  { x:7.08, y:2.5, w:5.3, h:0.5, fontFace:HFONT, fontSize:18, valign:"middle", margin:0 });
s.addText("No public privacy incident. You hold your own license key and bring your own API key — your account and your spend stay in your hands.",
  { x:7.08, y:3.1, w:5.25, h:1.5, fontFace:BFONT, fontSize:14, color:SLATE, valign:"top", lineSpacingMultiple:1.05, margin:0 });
s.addText("Straight talk: transcription is cloud (OpenAI Whisper) — same as Wispr. Neither is offline. We don't pretend otherwise.",
  { x:7.08, y:4.85, w:5.25, h:1.1, fontFace:BFONT, fontSize:13, italic:true, color:"2C6E5B", valign:"top", lineSpacingMultiple:1.05, margin:0 });
s.addText("Sources: independent coverage (Medium / ModelPiper, 2025) and 2026 review roundups; criticisms stated as reported, not adjudicated.",
  { x:0.7, y:6.35, w:11.93, h:0.4, fontFace:BFONT, fontSize:10, color:"9AA1B5", valign:"top", margin:0 });

// ===================================================================
// SLIDE 9 — HONEST CONCESSIONS (light) — credibility
// ===================================================================
s = p.addSlide(); s.background={color:MIST};
eyebrow(s,"When NOT to buy",false);
title(s,[{text:"We'll tell you when Wispr is the better choice.",options:{color:INK}}]);
s.addText("Saying this out loud is exactly why the pitch lands. Buy SpeakEasy for the automation + cost story — not because Wispr is bad.",
  { x:0.7, y:1.95, w:12, h:0.5, fontFace:BFONT, fontSize:14, color:SLATE, valign:"top", margin:0 });
const conc = [
  ["You work across many languages","Wispr's 100+ vs our ~13. Real edge if you're not English-first."],
  ["You need it on a phone or Mac","Wispr ships Mac, iOS & Android. We're a Windows desk tool."],
  ["You want zero-setup polish","Wispr's learned dictionary & auto-format are more refined out of the box."],
  ["You live across many devices","Wispr syncs everywhere. SpeakEasy is one powerful desktop."],
];
conc.forEach((d,i)=>{
  const y=2.65+i*1.02;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y, w:11.93, h:0.85, fill:{color:WHITE}, line:{color:LINE,width:1}, rectRadius:0.1, shadow:shadow() });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.7, y, w:0.1, h:0.85, fill:{color:GOLD}, line:{type:"none"} });
  s.addText(d[0], { x:1.05, y, w:4.6, h:0.85, fontFace:HFONT, fontSize:15, bold:true, color:INK, valign:"middle", margin:0 });
  s.addText(d[1], { x:5.8, y, w:6.6, h:0.85, fontFace:BFONT, fontSize:13.5, color:SLATE, valign:"middle", margin:0 });
});
footer(s,false);

// ===================================================================
// SLIDE 10 — THE OFFER (dark)
// ===================================================================
s = p.addSlide(); s.background={color:INK};
s.addShape(p.shapes.OVAL, { x:-2.0, y:3.6, w:6.0, h:6.0, fill:{color:TEAL, transparency:82}, line:{type:"none"} });
s.addShape(p.shapes.OVAL, { x:9.6, y:-2.4, w:6.0, h:6.0, fill:{color:VIOLET, transparency:78}, line:{type:"none"} });
eyebrow(s,"The offer",true);
title(s,[{text:"Own your voice tool for ",options:{color:WHITE}},{text:"$99",options:{color:TEAL}},{text:" — once.",options:{color:WHITE}}],1.05,true);
s.addText("Less than 7 months of Wispr, then it's yours. Bring your own OpenAI key and run dictation for pennies.",
  { x:0.7, y:2.05, w:7.4, h:0.9, fontFace:BFONT, fontSize:16, color:"CDD3EA", valign:"top", lineSpacingMultiple:1.05, margin:0 });
[
  "Voice commands — run any action by name",
  "Unlimited webhook + AI-prompt actions",
  "Claude, GPT & OpenRouter support",
  "Per-action hotkeys + Cursor Lock",
  "2 devices · free updates · your API key",
].forEach((t,i)=>{
  const y=3.15+i*0.62;
  s.addShape(p.shapes.OVAL, { x:0.75, y:y+0.04, w:0.3, h:0.3, fill:{color:TEAL}, line:{type:"none"} });
  s.addText("✓", { x:0.75, y:y+0.04, w:0.3, h:0.3, fontFace:HFONT, fontSize:14, bold:true, color:INK, align:"center", valign:"middle", margin:0 });
  s.addText(t, { x:1.2, y, w:6.8, h:0.4, fontFace:BFONT, fontSize:15, color:WHITE, valign:"middle", margin:0 });
});
// price card
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:8.6, y:2.35, w:4.1, h:4.0, fill:{color:WHITE}, rectRadius:0.16, shadow:shadow() });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:9.55, y:2.16, w:2.2, h:0.42, fill:{color:VIOLET}, rectRadius:0.21, line:{type:"none"} });
s.addText("FOUNDING PRICE", { x:9.55, y:2.16, w:2.2, h:0.42, fontFace:HFONT, fontSize:10, bold:true, color:WHITE, align:"center", valign:"middle", charSpacing:1, margin:0 });
s.addText([{text:"$99",options:{fontSize:58,bold:true,color:INK}},{text:" once",options:{fontSize:18,color:SLATE}}],
  { x:8.6, y:2.95, w:4.1, h:1.0, fontFace:HFONT, align:"center", valign:"middle", margin:0 });
s.addText([{text:"vs Wispr ",options:{color:SLATE}},{text:"$180/yr",options:{color:BAD,strike:true}},{text:", forever",options:{color:SLATE}}],
  { x:8.6, y:3.95, w:4.1, h:0.4, fontFace:BFONT, fontSize:14, align:"center", valign:"middle", margin:0 });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:9.0, y:4.6, w:3.3, h:0.7, fill:{color:INDIGO}, rectRadius:0.12, line:{type:"none"} });
s.addText("Get your license →", { x:9.0, y:4.6, w:3.3, h:0.7, fontFace:HFONT, fontSize:16, bold:true, color:WHITE, align:"center", valign:"middle", margin:0 });
s.addText("Try the live calculator with your own Wispr usage — see your exact savings before you buy.",
  { x:8.75, y:5.45, w:3.8, h:0.8, fontFace:BFONT, fontSize:11.5, italic:true, color:SLATE, align:"center", valign:"top", lineSpacingMultiple:1.02, margin:0 });
footer(s,true);

// ===================================================================
// SLIDE 11 — CLOSE (dark)
// ===================================================================
s = p.addSlide(); s.background={color:INK};
s.addShape(p.shapes.OVAL, { x:8.2, y:2.6, w:7.0, h:7.0, fill:{color:TEAL, transparency:84}, line:{type:"none"} });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.9, y:2.4, w:0.32, h:0.32, fill:{color:TEAL}, rectRadius:0.08, line:{type:"none"} });
s.addText("SpeakEasy", { x:1.3, y:2.3, w:4, h:0.5, fontFace:HFONT, fontSize:17, bold:true, color:WHITE, valign:"middle", margin:0 });
s.addText([
  {text:"Wispr types for you.",options:{color:ICE, breakLine:true}},
  {text:"SpeakEasy ",options:{color:WHITE}},
  {text:"works",options:{color:TEAL}},
  {text:" for you.",options:{color:WHITE}},
], { x:0.85, y:3.0, w:11, h:1.8, fontFace:HFONT, fontSize:44, bold:true, valign:"top", lineSpacingMultiple:1.05, margin:0 });
s.addText("$99 once · your API key · voice that runs your marketing stack.",
  { x:0.9, y:4.95, w:10, h:0.6, fontFace:BFONT, fontSize:17, color:"AAB0C8", valign:"top", margin:0 });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x:0.9, y:5.75, w:3.5, h:0.72, fill:{color:INDIGO}, rectRadius:0.12, line:{type:"none"} });
s.addText("Get your license →", { x:0.9, y:5.75, w:3.5, h:0.72, fontFace:HFONT, fontSize:16, bold:true, color:WHITE, align:"center", valign:"middle", margin:0 });

p.writeFile({ fileName: path.join(__dirname, "..", "03-pitch-deck.pptx") }).then(f=>{
  console.log("WROTE", f);
}).catch(e=>{ console.error("ERR", e); process.exit(1); });
