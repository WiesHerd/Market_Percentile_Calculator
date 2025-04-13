import { PrismaClient } from "@prisma/client";
import type { Specialty as DBSpecialty, Synonym as DBSynonym } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Remove duplicate Prisma client instance
// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// const prisma = globalForPrisma.prisma ?? new PrismaClient();

// if (process.env.NODE_ENV !== 'production') {
//   globalForPrisma.prisma = prisma;
// }

interface Specialty {
  id: string;
  name: string;
  synonyms: {
    predefined: string[];
    custom: string[];
  };
}

type SpecialtyWithSynonyms = DBSpecialty & {
  synonyms: DBSynonym[];
};

export class SpecialtyService {
  static async getAllSpecialties(page = 1, limit = 50): Promise<{ specialties: Specialty[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [specialties, total] = await Promise.all([
        prisma.specialty.findMany({
          skip,
          take: limit,
          include: {
            synonyms: true,
          },
          orderBy: {
            name: 'asc',
          },
        }),
        prisma.specialty.count(),
      ]);

      return {
        specialties: specialties.map(specialty => ({
          id: specialty.id,
          name: specialty.name,
          synonyms: {
            predefined: specialty.synonyms.filter(s => s.type === 'PREDEFINED').map(s => s.text),
            custom: specialty.synonyms.filter(s => s.type === 'CUSTOM').map(s => s.text),
          },
        })),
        total,
      };
    } catch (error) {
      console.error('Error fetching specialties:', error);
      throw new Error('Failed to fetch specialties');
    }
  }

  static async searchSpecialties(query: string): Promise<Specialty[]> {
    try {
      const specialties = await prisma.specialty.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { synonyms: { some: { text: { contains: query, mode: 'insensitive' } } } },
          ],
        },
        include: {
          synonyms: true,
        },
        take: 50,
      });

      return specialties.map(specialty => ({
        id: specialty.id,
        name: specialty.name,
        synonyms: {
          predefined: specialty.synonyms.filter(s => s.type === 'PREDEFINED').map(s => s.text),
          custom: specialty.synonyms.filter(s => s.type === 'CUSTOM').map(s => s.text),
        },
      }));
    } catch (error) {
      console.error('Error searching specialties:', error);
      throw new Error('Failed to search specialties');
    }
  }

  static async createSpecialty(name: string): Promise<Specialty> {
    try {
      const specialty = await prisma.specialty.create({
        data: {
          name: name.trim(),
        },
        include: {
          synonyms: true,
        },
      });

      return {
        id: specialty.id,
        name: specialty.name,
        synonyms: {
          predefined: [],
          custom: [],
        },
      };
    } catch (error) {
      console.error('Error creating specialty:', error);
      throw new Error('Failed to create specialty');
    }
  }

  static async deleteSpecialty(id: string): Promise<void> {
    try {
      await prisma.specialty.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting specialty:', error);
      throw new Error('Failed to delete specialty');
    }
  }

  static async addSynonym(specialtyId: string, text: string): Promise<void> {
    try {
      await prisma.synonym.create({
        data: {
          text,
          type: 'CUSTOM',
          specialtyId,
        },
      });
    } catch (error) {
      console.error('Error adding synonym:', error);
      throw new Error('Failed to add synonym');
    }
  }

  static async removeSynonym(specialtyId: string, text: string): Promise<void> {
    try {
      await prisma.synonym.deleteMany({
        where: {
          specialtyId,
          text,
        },
      });
    } catch (error) {
      console.error('Error removing synonym:', error);
      throw new Error('Failed to remove synonym');
    }
  }

  static async getSpecialty(id: string): Promise<Specialty | null> {
    try {
      const specialty = await prisma.specialty.findUnique({
        where: { id },
        include: {
          synonyms: true,
        },
      });

      if (!specialty) {
        return null;
      }

      return {
        id: specialty.id,
        name: specialty.name,
        synonyms: {
          predefined: specialty.synonyms
            .filter((s: DBSynonym) => s.type === 'PREDEFINED')
            .map((s: DBSynonym) => s.text),
          custom: specialty.synonyms
            .filter((s: DBSynonym) => s.type === 'CUSTOM')
            .map((s: DBSynonym) => s.text),
        },
      };
    } catch (error) {
      console.error('Error fetching specialty:', error);
      throw new Error('Failed to fetch specialty');
    }
  }
} 