// Kokoro text-to-speech (runs locally, free). usage: node say.mjs <jobs.json>
// jobs.json: [{ "text": "...", "out": "path.wav" }, ...]  voice via KOKORO_VOICE (default am_michael)
import { KokoroTTS } from "kokoro-js";
import fs from "node:fs";

const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const voice = process.env.KOKORO_VOICE || "am_michael";
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
for (const j of jobs) {
  const audio = await tts.generate(j.text, { voice, speed: j.speed || 1.05 });
  await audio.save(j.out);
  console.log("wrote", j.out);
}
