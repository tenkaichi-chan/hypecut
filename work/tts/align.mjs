// Word timestamps for a speech wav, with Whisper running locally (transformers.js, no upload).
// usage: node align.mjs <in.wav> [<in2.wav> ...]   -> prints JSON [{file, words:[{text,start,end}]}]
import { pipeline } from "@huggingface/transformers";
import fs from "node:fs";

function readWav16k(file) {
  const b = fs.readFileSync(file);
  // minimal PCM WAV reader (16-bit or 32-bit float), any rate/channels -> mono Float32 at 16 kHz
  let p = 12, fmt, data;
  while (p < b.length) { const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4); if (id === "fmt ") fmt = p + 8; if (id === "data") { data = [p + 8, sz]; break; } p += 8 + sz; }
  const ch = b.readUInt16LE(fmt + 2), rate = b.readUInt32LE(fmt + 4), bits = b.readUInt16LE(fmt + 14), tag = b.readUInt16LE(fmt);
  const n = data[1] / (bits / 8) / ch, x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) { const o = data[0] + (i * ch + c) * (bits / 8); s += tag === 3 ? b.readFloatLE(o) : b.readInt16LE(o) / 32768; } x[i] = s / ch; }
  if (rate === 16000) return x;
  const m = Math.floor(n * 16000 / rate), y = new Float32Array(m);
  for (let i = 0; i < m; i++) { const t = i * rate / 16000, j = Math.floor(t), f = t - j; y[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f; }
  return y;
}

const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-base.en_timestamped", { dtype: "fp32" });
const outp = [];
for (const f of process.argv.slice(2)) {
  const r = await asr(readWav16k(f), { return_timestamps: "word", chunk_length_s: 30 });
  outp.push({ file: f, text: r.text, words: (r.chunks || []).map(c => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] })) });
}
console.log(JSON.stringify(outp));
