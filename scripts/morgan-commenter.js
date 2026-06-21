#!/usr/bin/env node
/**
 * Morgan — Auto-Commenter for VyroFlow
 * Posts a debate-hook comment within 5 minutes of upload.
 * Usage: node morgan-commenter.js <videoId> [commentType]
 * Comment types: debate | fail | skill | fortnite (default: fortnite)
 */

const https = require("https");

const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;
const CLIENT_ID = "407408718192.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

const COMMENT_TEMPLATES = {
  debate:   "Drop your setup below 👇 console or PC?",
  fail:     "This actually happened 💀 who's had worse?",
  skill:    "Rate this out of 10 👇",
  fortnite: "What do YOU play on? Comment below ⬇️",
};

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  }).toString();

  const res = await request({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }, params);

  if (!res.body.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(res.body));
  }
  return res.body.access_token;
}

async function postComment(accessToken, videoId, text) {
  const body = JSON.stringify({
    snippet: {
      videoId,
      topLevelComment: { snippet: { textOriginal: text } },
    },
  });

  const res = await request({
    hostname: "www.googleapis.com",
    path: "/youtube/v3/commentThreads?part=snippet",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  if (res.status !== 200) throw new Error("Post comment failed: " + JSON.stringify(res.body));
  return res.body.id;
}

async function run() {
  const videoId = process.argv[2];
  const type = process.argv[3] || "fortnite";

  if (!videoId) {
    console.error("Usage: node morgan-commenter.js <videoId> [debate|fail|skill|fortnite]");
    process.exit(1);
  }

  if (!REFRESH_TOKEN) {
    console.error("Set YOUTUBE_REFRESH_TOKEN environment variable first.");
    process.exit(1);
  }

  const commentText = COMMENT_TEMPLATES[type] || COMMENT_TEMPLATES.fortnite;
  console.log(`\n🤖 Morgan posting to: https://youtube.com/shorts/${videoId}`);
  console.log(`   Comment type: ${type}`);
  console.log(`   Comment: "${commentText}"`);

  try {
    const accessToken = await getAccessToken();
    const threadId = await postComment(accessToken, videoId, commentText);
    console.log(`\n✅ Comment posted! Thread ID: ${threadId}`);
    console.log(`\n📌 PIN THIS in YouTube Studio → Comments → find and pin it.`);
    console.log(`🔗 https://youtube.com/shorts/${videoId}`);
  } catch (err) {
    console.error("❌ Morgan failed:", err.message);
    process.exit(1);
  }
}

run();
