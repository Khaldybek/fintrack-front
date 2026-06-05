import { CheckoutPageContent } from "./checkout-page-content";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function CheckoutPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <CheckoutPageContent sessionId={sessionId} />;
}
