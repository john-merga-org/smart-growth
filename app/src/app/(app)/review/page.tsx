import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { todayData } from "@/lib/server/today";
import { findBlock } from "@/lib/content/courses";
import { getUnitState } from "@/lib/server/learn";
import { getUnitIndex } from "@/lib/content/courses";
import { Mdx } from "@/lib/content/render";
import { mdxComponents } from "@/components/blocks";
import { UnitProvider } from "@/components/unit/context";
import { ReviewSession } from "@/components/review/session";
import { HighlightCard } from "@/components/review/highlight-card";
import { previewIntervals, type StoredCard } from "@/lib/srs/cards";

export const metadata = { title: "Review" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ min?: string }> }) {
  const { min } = await searchParams;
  const { plan } = await todayData(min ? Number(min) : undefined);
  const next = plan.cards[0];

  if (!next) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-16 text-center">
        <h1 className="text-2xl font-semibold">Reviews done ✓</h1>
        <p className="text-ink-3">{plan.cardsLeftAfterCap ? `${plan.cardsLeftAfterCap} more are due but held back by your daily cap. They'll come tomorrow.` : "Nothing else is due."}</p>
        <Link href="/" className="text-accent hover:underline">Back to Today</Link>
      </div>
    );
  }

  const db = await getDb();
  const [card] = await db.select().from(schema.cards).where(eq(schema.cards.id, next.id));
  const intervals = previewIntervals(card.fsrs as StoredCard, new Date());
  const remaining = plan.cards.length;

  let body: React.ReactNode;
  if (card.kind === "highlight") {
    body = <HighlightCard front={card.front ?? ""} back={card.back ?? ""} />;
  } else {
    const found = findBlock(card.sourceKey);
    if (!found) {
      // The block was removed from the content: retire the card quietly.
      await db.update(schema.cards).set({ suspended: true }).where(eq(schema.cards.id, card.id));
      body = <p className="text-ink-3">This card&apos;s source was removed from the course. It has been suspended. Refresh for the next card.</p>;
    } else {
      const entry = getUnitIndex(found.course, found.unit)!;
      const state = await getUnitState(found.course, found.unit, entry.index);
      body = (
        <UnitProvider state={state} mode="review">
          <div className="prose max-w-none dark:prose-invert">
            <Mdx source={found.block.source} components={mdxComponents} />
          </div>
        </UnitProvider>
      );
    }
  }

  const found = card.kind === "highlight" ? null : findBlock(card.sourceKey);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-3">
        <span>{remaining} left in this session</span>
        {found && (
          <Link href={`/c/${found.course.id}/${found.unit.id}${found.block.sectionId ? `#${found.block.sectionId}` : ""}`} className="hover:underline">
            {found.course.labels.unit} {found.unit.id} ↗
          </Link>
        )}
      </div>
      <ReviewSession cardId={card.id} intervals={intervals}>{body}</ReviewSession>
    </div>
  );
}
