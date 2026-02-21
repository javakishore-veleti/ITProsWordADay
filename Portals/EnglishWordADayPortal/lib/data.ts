// lib/data.ts — Types, genres, expressions (client-safe, no Node.js modules)

export interface Word {
  id: string;
  word: string;
  meaning: string;
  genre: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  dateAdded: string;
  samplePhrase: string;
  itContext: string;
  alternativeWords: string[];
  pronunciation: string;
  partOfSpeech: string;
  ratings: number[];
}

export interface Genre {
  slug: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const GENRES: Genre[] = [
  { slug: "cloud", name: "Cloud Computing", icon: "☁️", description: "Words for cloud architecture and infrastructure", color: "#3B82F6" },
  { slug: "software-dev", name: "Software Development", icon: "💻", description: "Core programming and development vocabulary", color: "#8B5CF6" },
  { slug: "design", name: "Design & UX", icon: "🎨", description: "Words for design thinking and user experience", color: "#EC4899" },
  { slug: "debugging", name: "Debugging & QA", icon: "🔍", description: "Testing, debugging, and quality assurance terms", color: "#F59E0B" },
  { slug: "security", name: "Security", icon: "🔒", description: "Cybersecurity and data protection vocabulary", color: "#EF4444" },
  { slug: "ai-ml", name: "AI & Machine Learning", icon: "🤖", description: "Artificial intelligence and ML terminology", color: "#10B981" },
  { slug: "data-science", name: "Data Science", icon: "📊", description: "Data analysis and engineering words", color: "#06B6D4" },
  { slug: "devops", name: "DevOps & SRE", icon: "⚙️", description: "Infrastructure, pipelines, and operations", color: "#F97316" },
  { slug: "project-mgmt", name: "Project Management", icon: "📋", description: "Agile, Scrum, and team management terms", color: "#6366F1" },
  { slug: "communication", name: "Professional Communication", icon: "💬", description: "Express opinions and feelings professionally", color: "#14B8A6" },
  { slug: "git-version", name: "Git & Version Control", icon: "🔀", description: "Git workflows and commit conventions", color: "#A855F7" },
  { slug: "appreciation", name: "Team Appreciation", icon: "🌟", description: "Words for recognizing and appreciating colleagues", color: "#F472B6" },
];

export function getGenreBySlug(slug: string): Genre | undefined {
  return GENRES.find((g) => g.slug === slug);
}

export function getAverageDifficulty(word: Word): number {
  if (word.ratings.length === 0) return word.difficulty;
  return word.ratings.reduce((a, b) => a + b, 0) / word.ratings.length;
}

// ========== Professional Expression Helpers ==========

export interface ProfessionalExpression {
  feeling: string;
  unprofessional: string;
  professional: string;
  jiraComment: string;
  slackMessage: string;
  gitCommit: string;
}

export const PROFESSIONAL_EXPRESSIONS: ProfessionalExpression[] = [
  {
    feeling: "Frustrated",
    unprofessional: "This code is absolute garbage and whoever wrote it should be ashamed.",
    professional: "I've identified several areas in this module that would benefit from refactoring to improve maintainability and readability.",
    jiraComment: "The current implementation presents maintainability challenges. Proposing a refactor to improve code quality and reduce future technical debt.",
    slackMessage: "Hey team, I noticed some patterns in the auth module that could be improved. Happy to pair with anyone on a refactoring session this sprint.",
    gitCommit: "refactor(auth): improve code structure for better maintainability",
  },
  {
    feeling: "Annoyed",
    unprofessional: "Why does this keep breaking? Nobody tests anything around here.",
    professional: "I've noticed recurring issues in this area. I'd like to propose adding more comprehensive test coverage to prevent regressions.",
    jiraComment: "Recurring defects suggest a gap in test coverage for this module. Recommending we add integration tests to the CI pipeline.",
    slackMessage: "I've seen this issue resurface a few times. Would it be helpful if I drafted some additional test cases to cover these edge cases?",
    gitCommit: "test(payments): add integration tests to prevent recurring regressions",
  },
  {
    feeling: "Overwhelmed",
    unprofessional: "I can't handle all this work — this is impossible and nobody cares.",
    professional: "I'd like to discuss workload prioritization. The current backlog exceeds our sprint capacity, and I want to ensure we deliver quality over quantity.",
    jiraComment: "Flagging capacity concern: current sprint commitments may need reprioritization to maintain quality standards.",
    slackMessage: "Hi team, I want to flag that our current workload is significant. Could we review priorities together to ensure we're focusing on the highest-impact items?",
    gitCommit: "docs(planning): document sprint capacity constraints and priorities",
  },
  {
    feeling: "Irritated by meetings",
    unprofessional: "This meeting could have been an email. Stop wasting everyone's time.",
    professional: "To maximize our productivity, could we share updates asynchronously and reserve meeting time for discussions that require real-time collaboration?",
    jiraComment: "Proposing async status updates via JIRA comments to reduce meeting overhead. Synchronous discussions reserved for blockers and design decisions.",
    slackMessage: "Thinking we could try sharing status updates here instead of the daily sync — would free up 30 min/day for focused work. Thoughts?",
    gitCommit: "docs(process): propose async standup format for improved velocity",
  },
  {
    feeling: "Disappointed with code review",
    unprofessional: "Your PR is terrible. Did you even look at this before submitting?",
    professional: "I've left some suggestions on the PR. A few patterns could be improved for consistency with our codebase standards. Happy to walk through them.",
    jiraComment: "PR review completed with several improvement suggestions. Patterns identified that deviate from established coding standards.",
    slackMessage: "Left some feedback on your PR — mostly around consistency with our patterns. Let me know if you'd like to pair on the changes!",
    gitCommit: "review(pr): suggest pattern improvements for codebase consistency",
  },
  {
    feeling: "Fuming about production incident",
    unprofessional: "Who deployed this without testing? This is completely unacceptable!",
    professional: "We've identified the root cause of the incident. I'd like to propose a post-mortem focused on process improvements rather than blame.",
    jiraComment: "Production incident resolved. Root cause identified. Scheduling blameless post-mortem to improve deployment safeguards.",
    slackMessage: "Incident resolved. Before we move on, I think a quick blameless retro would help us strengthen our deploy process. I can facilitate.",
    gitCommit: "fix(deploy): add pre-deploy validation to prevent configuration drift",
  },
];
