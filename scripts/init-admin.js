const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function loadProjectEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadProjectEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PAGE_KEYS = [
  "dashboard",
  "hotels",
  "configs",
  "reviews",
  "stats",
  "wordcloud",
  "ai-report",
  "track-match",
  "alerts",
  "settings",
  "admin-users",
  "admin-roles",
];

const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

async function main() {
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password === "YOUR_ADMIN_INITIAL_PASSWORD_HERE") {
    throw new Error(
      "Missing ADMIN_INITIAL_PASSWORD. Refusing to initialize admin with an implicit password."
    );
  }
  if (password.length < 10) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be at least 10 characters.");
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: { isAdmin: true },
    create: { name: "admin", isAdmin: true },
  });

  for (const pageKey of PAGE_KEYS) {
    await prisma.pagePermission.upsert({
      where: { roleId_pageKey: { roleId: adminRole.id, pageKey } },
      update: { canAccess: true },
      create: { roleId: adminRole.id, pageKey, canAccess: true },
    });
  }

  const passwordHash = hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash,
      status: "approved",
      roleId: adminRole.id,
      approvedAt: new Date(),
    },
    create: {
      accountType: "web",
      username: "admin",
      passwordHash,
      nickname: "System Admin",
      status: "approved",
      roleId: adminRole.id,
      approvedAt: new Date(),
    },
  });

  console.log(`Admin user initialized: ${admin.username}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
