"use client";

interface Props {
  slug: string;
  icon: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const GENRE_VISUALS: Record<string, { gradient: string; pattern: string; accent: string }> = {
  cloud: {
    gradient: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 40%, #60a5fa 100%)",
    pattern: "M20,40 Q35,20 50,40 T80,40",
    accent: "#3b82f6",
  },
  "software-dev": {
    gradient: "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 40%, #a78bfa 100%)",
    pattern: "M15,60 L30,30 L45,50 L60,20 L75,45 L85,25",
    accent: "#8b5cf6",
  },
  design: {
    gradient: "linear-gradient(135deg, #fce7f3 0%, #f9a8d4 40%, #f472b6 100%)",
    pattern: "M50,20 L65,45 L90,45 L70,60 L78,85 L50,70 L22,85 L30,60 L10,45 L35,45 Z",
    accent: "#ec4899",
  },
  debugging: {
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 40%, #fbbf24 100%)",
    pattern: "M25,50 A25,25 0 1,1 75,50 A25,25 0 1,1 25,50 M40,42 L46,48 L60,34",
    accent: "#f59e0b",
  },
  security: {
    gradient: "linear-gradient(135deg, #fee2e2 0%, #fca5a5 40%, #f87171 100%)",
    pattern: "M50,20 L50,55 M35,35 L65,35 M30,55 A20,20 0 0,0 70,55 L70,40 A20,20 0 0,0 30,40 Z",
    accent: "#ef4444",
  },
  "ai-ml": {
    gradient: "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 40%, #34d399 100%)",
    pattern: "M30,30 L50,20 L70,30 L80,50 L70,70 L50,80 L30,70 L20,50 Z M50,35 L50,65 M35,50 L65,50",
    accent: "#10b981",
  },
  "data-science": {
    gradient: "linear-gradient(135deg, #cffafe 0%, #67e8f9 40%, #22d3ee 100%)",
    pattern: "M20,70 L20,40 L35,70 L35,30 L50,70 L50,50 L65,70 L65,25 L80,70 L80,45",
    accent: "#06b6d4",
  },
  devops: {
    gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #fb923c 100%)",
    pattern: "M30,50 A20,20 0 1,1 50,30 M50,30 A20,20 0 1,1 70,50 M70,50 A20,20 0 1,1 50,70 M50,70 A20,20 0 1,1 30,50",
    accent: "#f97316",
  },
  "project-mgmt": {
    gradient: "linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 40%, #818cf8 100%)",
    pattern: "M25,30 L75,30 M25,45 L65,45 M25,60 L55,60 M25,75 L45,75",
    accent: "#6366f1",
  },
  communication: {
    gradient: "linear-gradient(135deg, #ccfbf1 0%, #5eead4 40%, #2dd4bf 100%)",
    pattern: "M25,60 Q25,30 50,30 Q75,30 75,50 Q75,65 55,65 L45,75 L45,65 Q25,65 25,60",
    accent: "#14b8a6",
  },
  "git-version": {
    gradient: "linear-gradient(135deg, #f3e8ff 0%, #c084fc 40%, #a855f7 100%)",
    pattern: "M50,20 L50,80 M50,35 L70,50 L50,50 M50,60 L30,45 L50,45",
    accent: "#a855f7",
  },
  appreciation: {
    gradient: "linear-gradient(135deg, #fce7f3 0%, #f9a8d4 40%, #f472b6 100%)",
    pattern: "M50,75 L20,45 A15,15 0 0,1 50,25 A15,15 0 0,1 80,45 Z",
    accent: "#f472b6",
  },
};

const SIZES = { sm: 120, md: 200, lg: 280 };

export default function GenreIllustration({ slug, icon, name, size = "md" }: Props) {
  const px = SIZES[size];
  const visual = GENRE_VISUALS[slug] || GENRE_VISUALS["cloud"];

  return (
    <div
      className="genre-illustration"
      style={{ width: px, height: px, background: visual.gradient }}
      aria-label={`${name} illustration`}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} className="absolute inset-0">
        <path
          d={visual.pattern}
          fill="none"
          stroke={visual.accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
        />
      </svg>
      <span className="relative text-5xl drop-shadow-sm" style={{ fontSize: px * 0.3 }}>
        {icon}
      </span>
    </div>
  );
}
