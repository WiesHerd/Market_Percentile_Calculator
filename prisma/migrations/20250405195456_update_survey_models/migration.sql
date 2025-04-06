/*
  Warnings:

  - You are about to drop the column `data` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the column `specialtyMappings` on the `surveys` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "surveys" DROP COLUMN "data",
DROP COLUMN "specialtyMappings",
ADD COLUMN     "mappingProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN     "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "survey_data" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "providerType" TEXT,
    "region" TEXT,
    "nOrgs" DOUBLE PRECISION,
    "nIncumbents" DOUBLE PRECISION,
    "tccP25" DOUBLE PRECISION,
    "tccP50" DOUBLE PRECISION,
    "tccP75" DOUBLE PRECISION,
    "tccP90" DOUBLE PRECISION,
    "wrvuP25" DOUBLE PRECISION,
    "wrvuP50" DOUBLE PRECISION,
    "wrvuP75" DOUBLE PRECISION,
    "wrvuP90" DOUBLE PRECISION,
    "cfP25" DOUBLE PRECISION,
    "cfP50" DOUBLE PRECISION,
    "cfP75" DOUBLE PRECISION,
    "cfP90" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_mappings" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "sourceSpecialty" TEXT NOT NULL,
    "mappedSpecialty" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialty_mappings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_data" ADD CONSTRAINT "survey_data_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_mappings" ADD CONSTRAINT "specialty_mappings_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
