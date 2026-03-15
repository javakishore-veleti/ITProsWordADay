# README: Add New Word / Add New Genre

This guide documents the fastest, lowest-risk process to add vocabulary updates.

It is based on the proven commit:
- `eba9173` -> added "Adroitness" to all 17 genres
- Pattern used there: update JSON data files directly in both frontend and backend paths

## Why this process

The app reads words from file-based JSON in two places:
- Frontend static data: `Portals/EnglishWordADayPortal/public/data/words/...`
- Backend API data: `Services/EnglishWordADayService/data/words/...`

If you update only one side, UI and API can drift.

## Word JSON schema (required fields)

Each word object must include:
- `id` (string)
- `word` (string)
- `meaning` (string)
- `genre` (string)
- `difficulty` (1 to 5)
- `dateAdded` (`YYYY-MM-DD`)
- `samplePhrase` (string)
- `itContext` (string)
- `alternativeWords` (array of strings)
- `pronunciation` (string)
- `partOfSpeech` (string)
- `ratings` (array of numbers)

## 1) Add one new word to one existing genre

Example genre: `cloud`

### Step 1: Edit frontend JSON

File:
- `Portals/EnglishWordADayPortal/public/data/words/cloud/words_001.json`

Append one new object at the end of the array.

Rules:
- Keep `id` sequence increasing (example: if last is `cloud-102`, next is `cloud-103`)
- Set `genre` to the folder slug exactly (`cloud`)
- Use valid JSON (no trailing commas)

### Step 2: Mirror same change to backend JSON

File:
- `Services/EnglishWordADayService/data/words/cloud/words_001.json`

Copy the exact same new object.

### Step 3: Quick validation

From repo root:

```bash
npm start
```

Then validate:
- UI page for genre loads
- New word appears in the genre rotation
- API search returns the word

Optional API check:

```bash
curl "http://localhost:8080/api/v1/words/search?genre=cloud&query=Adroitness"
```

## 2) Add one new word to all genres (Adroitness pattern)

This is exactly what commit `eba9173` did.

### Step 1: Prepare one canonical word object template

Keep shared fields identical, but adjust per genre:
- `id` prefix per genre (`cloud-...`, `devops-...`, etc.)
- `genre` value per genre folder
- `samplePhrase` and `itContext` can be genre-specific

### Step 2: Update all frontend genre files

Path pattern:
- `Portals/EnglishWordADayPortal/public/data/words/<genre>/words_001.json`

### Step 3: Update all backend genre files

Path pattern:
- `Services/EnglishWordADayService/data/words/<genre>/words_001.json`

### Step 4: Confirm frontend/backend parity

Run from repo root:

```bash
for g in Portals/EnglishWordADayPortal/public/data/words/*; do
  genre=$(basename "$g")
  fe="Portals/EnglishWordADayPortal/public/data/words/$genre/words_001.json"
  be="Services/EnglishWordADayService/data/words/$genre/words_001.json"
  if [ -f "$fe" ] && [ -f "$be" ]; then
    cmp -s "$fe" "$be" || echo "Mismatch: $genre"
  fi
done
```

If no output is printed, both sides match.

## 3) Add a brand-new genre

Adding a genre has data + UI metadata updates.

### Step 1: Add word data folders/files in both sides

Create:
- `Portals/EnglishWordADayPortal/public/data/words/<new-genre>/words_001.json`
- `Services/EnglishWordADayService/data/words/<new-genre>/words_001.json`

Put at least one valid word object to avoid empty experience.

### Step 2: Register genre metadata

Edit:
- `Portals/EnglishWordADayPortal/lib/data.ts`

Add a new entry into `GENRES` with:
- `slug`
- `name`
- `icon`
- `description`
- `color`

### Step 3: Add unique genre illustration style

Edit:
- `Portals/EnglishWordADayPortal/components/GenreIllustration.tsx`

Add a new key inside `GENRE_VISUALS` using the same slug.

### Step 4: Validate route generation

No extra route wiring is usually needed because genre pages are generated from `GENRES` in:
- `Portals/EnglishWordADayPortal/app/genre/[slug]/page.tsx`

### Step 5: Run local smoke test

```bash
npm start
```

Verify:
- Homepage shows the new genre
- Genre page renders with image/illustration
- Search can find words from the new genre
- Backend search by `genre=<new-genre>` works

## Common mistakes to avoid

- Updating only frontend JSON and forgetting backend JSON
- Duplicate IDs within a genre file
- Wrong slug (`data.ts` slug not matching folder name)
- Invalid `difficulty` value outside 1 to 5
- Invalid `dateAdded` format
- Reusing genre visuals or missing visual entry for new genre

## Recommended commit style

Use explicit commit messages:
- `add: word <WordName> to <genre>`
- `add: <WordName> to all genres (dateAdded YYYY-MM-DD)`
- `add: new genre <slug> with seed words`

## Fast checklist before push

- Frontend and backend JSON both updated
- IDs are sequential and unique
- JSON is valid
- New/updated words visible in UI
- API search returns expected results
- New genre added to `GENRES` and `GENRE_VISUALS` (if applicable)

## Notes for future automation

Current proven workflow is direct JSON edit (as in `eba9173`).

Automation is now available via:
- `scripts/add-word.js`
- `npm run word:add`
- `npm run word:add:dry`

### Add one word to one genre

```bash
npm run word:add -- \
  --genre cloud \
  --word Adroitness \
  --meaning "Cleverness or skill." \
  --difficulty 3 \
  --date 2026-02-23 \
  --part-of-speech noun \
  --pronunciation "/əˈdroitnəs/" \
  --alternatives "skill,skillfulness,prowess,expertise" \
  --ratings "3,4,4"
```

### Add one word to all genres (Adroitness-style)

```bash
npm run word:add -- \
  --all-genres \
  --word Adroitness \
  --meaning "Cleverness or skill." \
  --difficulty 3 \
  --date 2026-02-23 \
  --part-of-speech noun \
  --pronunciation "/əˈdroitnəs/" \
  --alternatives "skill,skillfulness,prowess,expertise,adeptness"
```

### Dry-run before writing files

```bash
npm run word:add:dry -- \
  --all-genres \
  --word Adroitness \
  --meaning "Cleverness or skill."
```

### What the script does

- Auto-detects all genres with both frontend/backend files when `--all-genres` is used
- Auto-increments ID based on existing prefix and max sequence in each genre file
- Writes identical updated arrays to both frontend and backend paths
- Validates difficulty and date format
