import { GENRES, getGenreBySlug } from "@/lib/data";
import { getWordsByGenre } from "@/lib/data.server";
import { notFound } from "next/navigation";
import GenreClient from "./GenreClient";

export function generateStaticParams() {
  return GENRES.map((genre) => ({ slug: genre.slug }));
}

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);
  if (!genre) notFound();
  const words = getWordsByGenre(slug);
  return <GenreClient genre={genre} words={words} />;
}
