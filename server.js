import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 8080;

// __dirname 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 設定 =====
const DOG_API_URL = "https://dog.ceo/api/breeds/image/random";
const LLM_API_URL = "https://openai-api-proxy-746164391621.us-west1.run.app/v1/chat/completions";
const LLM_API_KEY = process.env.LLM_API_KEY;

// ===== middleware =====
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== API =====
app.post("/generate", async (req, res) => {
  const d = req.body || {};

  const dogName = d.dogName || "名無しの犬";
  const personality = d.personality || "優しい";
  const relationship = d.relationship || "家族";
  const storyType = d.storyType || "日常";
  const tone = d.tone || "絵本風";
  const length = d.length || "600";

  // --- dogAP ---
  let dogImg = "";
  try {
    const dogRes = await fetch(DOG_API_URL);
    const dogJson = await dogRes.json();
    dogImg = dogJson.message;
  } catch (e) {
    console.error("dogAP error", e);
  }

  // --- ① 物語生成 ---
  const storyPrompt = `
犬の名前は「${dogName}」。
犬の性格は「${personality}」。
この犬は飼い主にとって「${relationship}」のような存在である。
物語ジャンルは「${storyType}」。
語り口は「${tone}」。
物語の長さは約${length}文字にすること。

以下の犬のイメージを参考にして、
その人にしか当てはまらない物語を書いてください。
画像URL: ${dogImg}
`;

  let storyText = "物語の生成に失敗しました。";

  try {
    const storyRes = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: storyPrompt }]
      })
    });

    const storyJson = await storyRes.json();
    storyText = storyJson.choices[0].message.content;
  } catch (e) {
    console.error("LLM story error", e);
  }

  // --- ② タイトル生成 ---
  const titlePrompt = `
次の物語にふさわしい、日本語のタイトルを1つ考えてください。

${storyText}
`;

  let title = "タイトル未生成";

  try {
    const titleRes = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: titlePrompt }]
      })
    });

    const titleJson = await titleRes.json();
    title = titleJson.choices[0].message.content.trim();
  } catch (e) {
    console.error("LLM title error", e);
  }

  res.json({ title, story: storyText });
});

// ===== start =====
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
