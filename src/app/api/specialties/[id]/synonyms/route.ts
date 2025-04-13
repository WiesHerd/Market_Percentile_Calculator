import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const synonym = await prisma.synonym.create({
      data: {
        text: text.trim(),
        type: 'CUSTOM',
        specialtyId: params.id,
      },
    });

    return NextResponse.json(synonym);
  } catch (error) {
    console.error('Error adding synonym:', error);
    return NextResponse.json(
      { error: 'Failed to add synonym' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    await prisma.synonym.deleteMany({
      where: {
        specialtyId: params.id,
        text: text.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing synonym:', error);
    return NextResponse.json(
      { error: 'Failed to remove synonym' },
      { status: 500 }
    );
  }
} 