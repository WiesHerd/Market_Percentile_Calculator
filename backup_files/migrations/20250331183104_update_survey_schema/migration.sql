/*
  Warnings:

  - The `status` column on the `Survey` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `SurveyData` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `year` on table `Survey` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "SurveyData" DROP CONSTRAINT "SurveyData_surveyId_fkey";

-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "status",
ADD COLUMN     "status" "SurveyStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "year" SET NOT NULL;

-- DropTable
DROP TABLE "SurveyData";

-- CreateTable
CREATE TABLE "survey_data" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "surveyId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "provider_type" TEXT,
    "geographic_region" TEXT,
    "n_orgs" INTEGER,
    "n_incumbents" INTEGER,
    "tcc_p25" DOUBLE PRECISION,
    "tcc_p50" DOUBLE PRECISION,
    "tcc_p75" DOUBLE PRECISION,
    "tcc_p90" DOUBLE PRECISION,
    "wrvu_p25" DOUBLE PRECISION,
    "wrvu_p50" DOUBLE PRECISION,
    "wrvu_p75" DOUBLE PRECISION,
    "wrvu_p90" DOUBLE PRECISION,
    "cf_p25" DOUBLE PRECISION,
    "cf_p50" DOUBLE PRECISION,
    "cf_p75" DOUBLE PRECISION,
    "cf_p90" DOUBLE PRECISION,

    CONSTRAINT "survey_data_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_data" ADD CONSTRAINT "survey_data_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
