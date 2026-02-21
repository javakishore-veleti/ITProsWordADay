const fs = require("fs");
const path = require("path");

const BASE_FE = (g) => path.resolve(__dirname, "..", "public", "data", "words", g, "words_001.json");
const BASE_BE = (g) => path.resolve(__dirname, "..", "..", "..", "Services", "EnglishWordADayService", "data", "words", g, "words_001.json");

function dateFor(i) {
  const d = new Date("2025-11-14");
  d.setDate(d.getDate() + i);
  return d.toISOString().split("T")[0];
}

const extras = {
  cloud: [
    { word: "Telemetric", meaning: "Relating to the automatic measurement and wireless transmission of data from remote sources", pronunciation: "tel-eh-MET-rik", partOfSpeech: "adjective", difficulty: 4, alternativeWords: ["remote-sensing", "measurement-based", "data-collecting", "instrumented"] },
  ],
  "software-dev": [
    { word: "Transpile", meaning: "To convert source code from one programming language to another at a similar level of abstraction", pronunciation: "TRANS-pile", partOfSpeech: "verb", difficulty: 4, alternativeWords: ["cross-compile", "translate", "convert", "transform"] },
    { word: "Scaffold", meaning: "To generate the basic project structure and boilerplate as a starting point", pronunciation: "SKAF-old", partOfSpeech: "verb", difficulty: 2, alternativeWords: ["generate", "bootstrap", "template", "initialize"] },
  ],
  design: [
    { word: "Polychromatic", meaning: "Using multiple colors to create visual richness and variety", pronunciation: "pol-ee-kroh-MAT-ik", partOfSpeech: "adjective", difficulty: 4, alternativeWords: ["multicolored", "colorful", "variegated", "vibrant"] },
    { word: "Monochromatic", meaning: "Using variations of a single color for a unified elegant look", pronunciation: "mon-oh-kroh-MAT-ik", partOfSpeech: "adjective", difficulty: 3, alternativeWords: ["single-hued", "tonal", "one-color", "uniform"] },
    { word: "Ornamental", meaning: "Serving a decorative purpose rather than a functional one", pronunciation: "or-nuh-MEN-tul", partOfSpeech: "adjective", difficulty: 2, alternativeWords: ["decorative", "embellishing", "aesthetic", "ornate"] },
    { word: "Panoramic", meaning: "Showing a wide unobstructed view; a comprehensive visual experience", pronunciation: "pan-oh-RAM-ik", partOfSpeech: "adjective", difficulty: 2, alternativeWords: ["wide-angle", "sweeping", "expansive", "all-encompassing"] },
    { word: "Pixelated", meaning: "Displayed with visible individual pixels causing a blocky appearance", pronunciation: "PIK-sel-ay-ted", partOfSpeech: "adjective", difficulty: 2, alternativeWords: ["blocky", "low-resolution", "jaggy", "aliased"] },
  ],
};

for (const [genre, extra] of Object.entries(extras)) {
  const file = BASE_FE(genre);
  const words = JSON.parse(fs.readFileSync(file, "utf-8"));
  const prefix = words[0].id.split("-").slice(0, -1).join("-");

  for (const e of extra) {
    const idx = words.length;
    words.push({
      id: `${prefix}-${String(idx + 1).padStart(3, "0")}`,
      word: e.word,
      meaning: e.meaning,
      genre,
      difficulty: e.difficulty,
      dateAdded: dateFor(idx),
      samplePhrase: `Understanding ${e.word.toLowerCase()} concepts helps our team deliver better ${genre === "design" ? "user experiences" : genre === "cloud" ? "cloud solutions" : "software"}.`,
      itContext: `${e.word} is a valuable concept for IT professionals working in ${genre.replace("-", " ")}.`,
      alternativeWords: e.alternativeWords,
      pronunciation: e.pronunciation,
      partOfSpeech: e.partOfSpeech,
      ratings: [3, 4],
    });
  }

  fs.writeFileSync(file, JSON.stringify(words, null, 2));
  fs.mkdirSync(path.dirname(BASE_BE(genre)), { recursive: true });
  fs.writeFileSync(BASE_BE(genre), JSON.stringify(words, null, 2));
  console.log(`${genre}: now ${words.length} words`);
}
