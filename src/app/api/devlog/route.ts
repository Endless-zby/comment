import { NextResponse } from "next/server";
import { getLogs, getModules, clearLogs } from "@/services/logger";

export async function GET() {
  const logs = getLogs(undefined, undefined, 100);
  const modules = getModules();
  return NextResponse.json({ logs, modules });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ success: true });
}