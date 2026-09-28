/* ============================================================
   collateral/lib/review-tools.mjs — pictures and numbers for reviewing a render without watching it
   (ported from Cincy Week's collateral/lib/review-tools.mjs).
     node collateral/lib/review-tools.mjs sheet <video> <out.png> [fps=1] [cols=8]   contact sheet
     node collateral/lib/review-tools.mjs frames <video> <outdir> <t1,t2,…>          full-size stills
     node collateral/lib/review-tools.mjs audio <file> <out-prefix>                 spectrogram, waveform, loudness
   ============================================================ */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG } from "./promo-capture.mjs";

const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-y", "-loglevel", "error", ...args]);
const ffErr = (args) => String(spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr || "");
export const duration = (file) => Number((ffErr(["-i", file]).match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).reduce((s, v, i) => s + Number(v) * [3600, 60, 1][i], 0));

/** a labelled contact sheet at `fps` frames per second */
export function sheet(video, out, fps = 1, cols = 8, width = 216) {
  const tmp = `${out}.frames`; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  ff(["-i", video, "-vf", `fps=${fps},scale=${width}:-1`, `${tmp}/%04d.png`]);
  execFileSync("python3", ["-c", `
import glob,sys
from PIL import Image, ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'/*.png')); fps=float(sys.argv[3]); cols=int(sys.argv[4])
w,h=Image.open(fs[0]).size; rows=(len(fs)+cols-1)//cols
sheet=Image.new('RGB',(cols*w,rows*(h+22)),'white'); d=ImageDraw.Draw(sheet)
for i,f in enumerate(fs):
    x,y=(i%cols)*w,(i//cols)*(h+22); sheet.paste(Image.open(f).convert('RGB'),(x,y+22)); d.text((x+4,y+4),'%.2fs'%(i/fps+0.5/fps),fill='black')
sheet.save(sys.argv[2])`, tmp, out, String(fps), String(cols)]);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

/** full-size PNG stills at the given seconds */
export function frames(video, outDir, times) {
  fs.mkdirSync(outDir, { recursive: true });
  return times.map((t) => { const f = path.join(outDir, `frame-${t.toFixed(2)}s.png`); ff(["-ss", String(t), "-i", video, "-frames:v", "1", f]); return f; });
}

/** loudness of a file (ebur128 with true peak): { I, LRA, TP } */
export function loudness(file) {
  const r = ffErr(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const S = r.slice(r.lastIndexOf("Summary:"));
  const pick = (re) => Number((S.match(re) || [])[1]);
  return { I: pick(/I:\s+(-?[\d.]+) LUFS/), LRA: pick(/LRA:\s+([\d.]+) LU/), TP: pick(/Peak:\s+(-?[\d.]+) dBFS/) };
}

/** the decoded audio of an MP4, checked as plan.md §12.4 asks: loudness, true peak, sample peak, DC, largest step */
export function audioCheck(mp4, work) {
  const wav = path.join(work, path.basename(mp4).replace(/\.mp4$/, "-decoded.wav"));
  ff(["-i", mp4, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_f32le", wav]);
  const L = loudness(wav);
  const buf = fs.readFileSync(wav);
  const off = buf.indexOf("data") + 8, n = (buf.length - off) / 4;
  let pk = 0, dc = 0, step = 0, prevL = 0, prevR = 0;
  for (let i = 0; i < n; i += 2) {
    const l = buf.readFloatLE(off + i * 4), r = buf.readFloatLE(off + i * 4 + 4);
    pk = Math.max(pk, Math.abs(l), Math.abs(r)); dc += l + r;
    if (i) step = Math.max(step, Math.abs(l - prevL), Math.abs(r - prevR)); prevL = l; prevR = r;
  }
  fs.rmSync(wav, { force: true });
  return { ...L, samplePeakDb: +(20 * Math.log10(pk)).toFixed(2), dc: +(dc / n).toExponential(2), maxStep: +step.toFixed(3) };
}

/** spectrogram and waveform pictures */
export function audioPictures(file, prefix) {
  ff(["-i", file, "-lavfi", "showspectrumpic=s=1600x600:legend=1:scale=log:fscale=log:color=intensity", `${prefix}-spectrum.png`]);
  ff(["-i", file, "-lavfi", "showwavespic=s=1600x300:split_channels=1:colors=0x12264c|0xa7186f", `${prefix}-wave.png`]);
  return [`${prefix}-spectrum.png`, `${prefix}-wave.png`];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, a, b, c, d] = process.argv.slice(2);
  if (cmd === "sheet") console.log(sheet(a, b, Number(c || 1), Number(d || 8)));
  else if (cmd === "frames") console.log(frames(a, b, c.split(",").map(Number)).join("\n"));
  else if (cmd === "audio") { console.log(audioPictures(a, b).join("\n")); console.log(JSON.stringify(loudness(a))); }
  else { console.error("usage: sheet <video> <out.png> [fps] [cols] | frames <video> <outdir> <t,…> | audio <file> <out-prefix>"); process.exit(1); }
}
