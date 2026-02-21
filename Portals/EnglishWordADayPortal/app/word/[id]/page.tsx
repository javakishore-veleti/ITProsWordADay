import { loadAllWords, getWordById } from "@/lib/data.server";
import { notFound } from "next/navigation";
import WordDetailClient from "./WordDetailClient";

export function generateStaticParams() {
  return loadAllWords().map((word) => ({ id: word.id }));
}

export default async function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const word = getWordById(id);
  if (!word) notFound();
  return <WordDetailClient word={word} />;
}
