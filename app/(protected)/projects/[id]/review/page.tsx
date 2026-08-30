import { notFound } from "next/navigation";
import { getReviewPage } from "@/features/review/application/get-review-page";
import { ReviewScreen } from "@/features/review/ui/review-screen";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await getReviewPage(id);
  if (!model) notFound();

  return <ReviewScreen projectId={id} model={model} />;
}
