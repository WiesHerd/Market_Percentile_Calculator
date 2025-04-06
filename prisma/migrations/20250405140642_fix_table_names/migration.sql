/*
  Warnings:

  - You are about to drop the `Survey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SurveyTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "specialty_mappings" DROP CONSTRAINT "specialty_mappings_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "survey_data" DROP CONSTRAINT "survey_data_surveyId_fkey";

-- DropTable
DROP TABLE "Survey";

-- DropTable
DROP TABLE "SurveyTemplate";

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "columnMappings" JSONB NOT NULL,
    "specialtyMappings" JSONB NOT NULL,
    "columns" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "lastUsed" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_data" ADD CONSTRAINT "survey_data_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_mappings" ADD CONSTRAINT "specialty_mappings_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
