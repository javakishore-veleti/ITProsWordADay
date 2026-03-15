#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const FE_WORDS_ROOT = path.join(
  ROOT,
  "Portals",
  "EnglishWordADayPortal",
  "public",
  "data",
  "words"
);
const BE_WORDS_ROOT = path.join(
  ROOT,
  "Services",
  "EnglishWordADayService",
  "data",
  "words"
);

function printHelp() {
  console.log(`Usage:
  node scripts/add-word.js --genre <slug> --word <text> --meaning <text> [options]
  node scripts/add-word.js --all-genres --word <text> --meaning <text> [options]

Required:
  --word                Word text
  --meaning             Word meaning
  --genre <slug>        Target one genre OR
  --all-genres          Target all available genres

Optional:
  --difficulty <1-5>              Default: 3
  --date <YYYY-MM-DD>             Default: today
  --pronunciation <text>          Default: ""
  --part-of-speech <text>         Default: noun
  --alternatives "a,b,c"          Default: []
  --sample-phrase <text>          Default: auto-generated per genre
  --it-context <text>             Default: auto-generated per genre
  --ratings "3,4,5"              Default: []
  --dry-run                       Show planned changes without writing files
  --help                          Show this help
`);
}

function parseArgs(argv) {
  const out = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    if (token === "--all-genres" || token === "--dry-run" || token === "--help") {
      out[token.slice(2)] = true;
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }
    out[key] = value;
    i += 1;
  }

  return out;
}

function csvToList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseRatings(value) {
  const parts = csvToList(value);
  const ratings = parts.map((p) => Number(p));
  if (ratings.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
    throw new Error("--ratings must be a comma-separated list of integers from 1 to 5");
  }
  return ratings;
}

function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date must be in YYYY-MM-DD format");
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Expected array in ${filePath}`);
  }
  return data;
}

function writeJsonArray(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function inferPrefix(words, genre) {
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const id = String(words[i]?.id || "");
    const match = id.match(/^(.+)-(\d+)$/);
    if (match) return match[1];
  }
  return genre;
}

function nextSequence(words, prefix) {
  let maxValue = 0;
  for (const item of words) {
    const id = String(item?.id || "");
    const match = id.match(/^(.+)-(\d+)$/);
    if (!match) continue;
    if (match[1] !== prefix) continue;
    const n = Number(match[2]);
    if (Number.isInteger(n) && n > maxValue) {
      maxValue = n;
    }
  }
  return maxValue + 1;
}

function listGenres() {
  if (!fs.existsSync(FE_WORDS_ROOT) || !fs.existsSync(BE_WORDS_ROOT)) {
    throw new Error("Word roots not found. Run from repository root.");
  }

  const feGenres = fs
    .readdirSync(FE_WORDS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return feGenres.filter((genre) => {
    const feFile = path.join(FE_WORDS_ROOT, genre, "words_001.json");
    const beFile = path.join(BE_WORDS_ROOT, genre, "words_001.json");
    return fs.existsSync(feFile) && fs.existsSync(beFile);
  });
}

function buildWordPayload(genre, prefix, seq, options) {
  const id = `${prefix}-${String(seq).padStart(3, "0")}`;
  const samplePhrase =
    options["sample-phrase"] ||
    `The team's ${options.word.toLowerCase()} improved outcomes in ${genre.replace(/-/g, " ")} discussions.`;
  const itContext =
    options["it-context"] ||
    `${options.word} is useful vocabulary for IT professionals in ${genre.replace(/-/g, " ")} contexts.`;

  return {
    id,
    word: options.word,
    meaning: options.meaning,
    genre,
    difficulty: options.difficulty,
    dateAdded: options.date,
    samplePhrase,
    itContext,
    alternativeWords: options.alternatives,
    pronunciation: options.pronunciation,
    partOfSpeech: options.partOfSpeech,
    ratings: options.ratings,
  };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const hasGenre = Boolean(args.genre);
  const allGenres = Boolean(args["all-genres"]);

  if (!args.word || !args.meaning || hasGenre === allGenres) {
    console.error("Error: provide --word, --meaning, and exactly one of --genre or --all-genres");
    printHelp();
    process.exit(1);
  }

  const difficulty = Number(args.difficulty || 3);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    console.error("Error: --difficulty must be an integer between 1 and 5");
    process.exit(1);
  }

  const date = args.date || getTodayIso();
  try {
    validateDate(date);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  let ratings;
  try {
    ratings = parseRatings(args.ratings);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  const normalized = {
    word: args.word.trim(),
    meaning: args.meaning.trim(),
    difficulty,
    date,
    pronunciation: (args.pronunciation || "").trim(),
    partOfSpeech: (args["part-of-speech"] || args.partOfSpeech || "noun").trim(),
    alternatives: csvToList(args.alternatives),
    ratings,
    "sample-phrase": (args["sample-phrase"] || "").trim(),
    "it-context": (args["it-context"] || "").trim(),
  };

  const targetGenres = allGenres ? listGenres() : [args.genre];
  if (targetGenres.length === 0) {
    console.error("Error: no target genres found");
    process.exit(1);
  }

  let changes = 0;
  for (const genre of targetGenres) {
    const feFile = path.join(FE_WORDS_ROOT, genre, "words_001.json");
    const beFile = path.join(BE_WORDS_ROOT, genre, "words_001.json");

    if (!fs.existsSync(feFile) || !fs.existsSync(beFile)) {
      console.error(`Skip ${genre}: missing frontend/backend file pair`);
      continue;
    }

    const feWords = readJsonArray(feFile);
    const prefix = inferPrefix(feWords, genre);
    const seq = nextSequence(feWords, prefix);
    const payload = buildWordPayload(genre, prefix, seq, normalized);

    const nextFeWords = [...feWords, payload];

    if (!args["dry-run"]) {
      writeJsonArray(feFile, nextFeWords);
      writeJsonArray(beFile, nextFeWords);
    }

    console.log(`${args["dry-run"] ? "DRY-RUN" : "UPDATED"}: ${genre} -> ${payload.id}`);
    changes += 1;
  }

  if (changes === 0) {
    console.error("Error: no files updated");
    process.exit(1);
  }

  console.log(`Done: ${changes} genre(s) ${args["dry-run"] ? "planned" : "updated"}.`);
}

main();
