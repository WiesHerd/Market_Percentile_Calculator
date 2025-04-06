/*
  Warnings:

  - You are about to drop the column `lastUsed` on the `survey_templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "survey_templates" DROP COLUMN "lastUsed";

-- CreateTable
CREATE TABLE "standard_specialties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "synonyms" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standard_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialties" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialty_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standard_specialties_name_key" ON "standard_specialties"("name");
