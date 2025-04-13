import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const specialty = await prisma.specialty.findUnique({
      where: { id: params.id },
      include: {
        synonyms: true,
      },
    });

    if (!specialty) {
      return NextResponse.json(
        { error: 'Specialty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error fetching specialty:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specialty' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.specialty.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting specialty:', error);
    return NextResponse.json(
      { error: 'Failed to delete specialty' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const specialty = await prisma.specialty.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
      },
      include: {
        synonyms: true,
      },
    });

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error updating specialty:', error);
    return NextResponse.json(
      { error: 'Failed to update specialty' },
      { status: 500 }
    );
  }
} 