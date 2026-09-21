import { checkoutStatusResponse, createCheckoutSession } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return checkoutStatusResponse();
}

export async function POST(req: Request) {
  return createCheckoutSession(req);
}
