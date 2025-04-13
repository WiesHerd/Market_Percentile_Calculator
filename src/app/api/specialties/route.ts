import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/specialties - Get all specialties
export async function GET() {
  try {
    const specialties = await prisma.specialty.findMany({
      include: {
        synonyms: true,
      },
    });

    return NextResponse.json(specialties);
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return NextResponse.json({ error: 'Failed to fetch specialties' }, { status: 500 });
  }
}

// POST /api/specialties - Create a new specialty
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const specialty = await prisma.specialty.create({
      data: {
        name: name.trim(),
      },
      include: {
        synonyms: true,
      },
    });

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error creating specialty:', error);
    return NextResponse.json(
      { error: 'Failed to create specialty' },
      { status: 500 }
    );
  }
}

// PUT /api/specialties - Update a specialty
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, synonyms = [] } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 }
      );
    }

    // Update specialty and its synonyms
    const specialty = await prisma.specialty.update({
      where: { id },
      data: {
        name,
        synonyms: {
          deleteMany: {}, // Remove all existing synonyms
          create: synonyms.map((synonym: string) => ({
            text: synonym,
            type: 'CUSTOM',
          })),
        },
      },
      include: {
        synonyms: true,
      },
    });

    return NextResponse.json(specialty);
  } catch (error) {
    console.error("Error updating specialty:", error);
    return NextResponse.json(
      { error: "Failed to update specialty" },
      { status: 500 }
    );
  }
}

// DELETE /api/specialties - Delete a specialty
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.specialty.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting specialty:", error);
    return NextResponse.json(
      { error: "Failed to delete specialty" },
      { status: 500 }
    );
  }
} 