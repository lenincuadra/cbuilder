import { NextResponse } from "next/server";
import type { EditableFields } from "@/core/registry/types";
import { fileStore } from "@/lib/storage/fileStore";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const fields = (await request.json()) as EditableFields;
  try {
    await fileStore.update(code, fields);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  try {
    await fileStore.remove(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 400 },
    );
  }
}
