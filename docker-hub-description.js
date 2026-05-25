#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DOCKERHUB_USERNAME = process.env.DOCKERHUB_USERNAME;
const DOCKERHUB_TOKEN = process.env.DOCKERHUB_TOKEN;
const IMAGE_NAME = process.env.DOCKERHUB_IMAGE || "zhaoboya/ctrip-review-monitor";

if (!DOCKERHUB_USERNAME || !DOCKERHUB_TOKEN) {
  console.error("Error: DOCKERHUB_USERNAME and DOCKERHUB_TOKEN are required.");
  console.error("");
  console.error("Usage:");
  console.error("  DOCKERHUB_USERNAME=xxx DOCKERHUB_TOKEN=xxx node docker-hub-description.js");
  console.error("");
  console.error("Get your token at: https://hub.docker.com/settings/security");
  process.exit(1);
}

const descriptionFile = path.join(__dirname, "DOCKERHUB_README.md");

if (!fs.existsSync(descriptionFile)) {
  console.error(`Error: ${descriptionFile} not found.`);
  process.exit(1);
}

const fullDescription = fs.readFileSync(descriptionFile, "utf-8");

const shortDescription =
  "酒店评价监控系统 — 从携程、飞猪等 OTA 平台自动采集酒店评价，提供多维数据可视化与 AI 智能分析。Automated hotel review collection from Ctrip & Fliggy with analytics and AI insights.";

async function updateDockerHubDescription() {
  console.log(`Updating Docker Hub description for ${IMAGE_NAME}...`);

  const loginRes = await fetch("https://hub.docker.com/v2/users/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: DOCKERHUB_USERNAME,
      password: DOCKERHUB_TOKEN,
    }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error(`Login failed (${loginRes.status}): ${err}`);
    process.exit(1);
  }

  const { token } = await loginRes.json();
  console.log("Logged in successfully.");

  const patchRes = await fetch(
    `https://hub.docker.com/v2/repositories/${IMAGE_NAME}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        full_description: fullDescription,
        description: shortDescription,
      }),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error(`Update failed (${patchRes.status}): ${err}`);
    process.exit(1);
  }

  console.log("Docker Hub description updated successfully!");
}

updateDockerHubDescription().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
