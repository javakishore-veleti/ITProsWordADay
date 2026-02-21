const fs = require("fs");
const path = require("path");

const PORTAL = path.resolve(__dirname, "..");
const TS_DIR = path.join(PORTAL, "lib", "words");
const OUT_BASE = path.join(PORTAL, "public", "data", "words");
const GO_DATA = path.resolve(PORTAL, "..", "..", "Services", "EnglishWordADayService", "data", "words");

const FILES = [
  { file: "debugging.ts", genre: "debugging" },
  { file: "security.ts", genre: "security" },
  { file: "ai-ml.ts", genre: "ai-ml" },
  { file: "data-science.ts", genre: "data-science" },
  { file: "devops.ts", genre: "devops" },
  { file: "project-mgmt.ts", genre: "project-mgmt" },
  { file: "communication.ts", genre: "communication" },
  { file: "git-version.ts", genre: "git-version" },
  { file: "appreciation.ts", genre: "appreciation" },
];

for (const { file, genre } of FILES) {
  const tsPath = path.join(TS_DIR, file);
  if (!fs.existsSync(tsPath)) {
    console.warn(`SKIP: ${file} not found`);
    continue;
  }

  let content = fs.readFileSync(tsPath, "utf-8");

  // Strip TS import and export wrapper, isolate the JS array literal
  content = content.replace(/^import\s.*$/gm, "");
  content = content.replace(/export\s+const\s+\w+:\s*Word\[\]\s*=\s*/, "");
  content = content.replace(/;\s*$/, "").trim();

  try {
    // Evaluate as a JavaScript expression (valid JS object literals)
    const fn = new Function(`return ${content}`);
    const words = fn();
    console.log(`${genre}: ${words.length} words parsed`);

    // Write to public/data/words/{genre}/
    const frontendDir = path.join(OUT_BASE, genre);
    fs.mkdirSync(frontendDir, { recursive: true });
    fs.writeFileSync(
      path.join(frontendDir, "words_001.json"),
      JSON.stringify(words, null, 2)
    );

    // Write to Go backend data/words/{genre}/
    const backendDir = path.join(GO_DATA, genre);
    fs.mkdirSync(backendDir, { recursive: true });
    fs.writeFileSync(
      path.join(backendDir, "words_001.json"),
      JSON.stringify(words, null, 2)
    );
  } catch (err) {
    console.error(`ERROR parsing ${file}:`, err.message);
  }
}

console.log("\nDone.");
