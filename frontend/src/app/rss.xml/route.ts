import { GET as getFeed } from "@/app/feed.xml/route";

export const revalidate = 1800;

export async function GET() {
  return getFeed();
}

