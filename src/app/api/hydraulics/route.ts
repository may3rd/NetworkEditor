import { NextResponse } from "next/server";
import { NetworkState } from "@/lib/types";
import { runBackendMock } from "@/lib/backendMockData";

export async function POST(request: Request) {
  const body = (await request.json()) as NetworkState;
  const response = runBackendMock(body);
  return NextResponse.json(response);
}
