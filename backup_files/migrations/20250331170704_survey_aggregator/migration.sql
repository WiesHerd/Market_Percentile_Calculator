/*
  Warnings:

  - You are about to drop the column `status` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `vendor` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `cf_p25` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `cf_p50` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `cf_p75` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `cf_p90` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `geographic_region` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `n_incumbents` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `n_orgs` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `provider_type` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `tcc_p25` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `tcc_p50` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `tcc_p75` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `tcc_p90` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `wrvu_p25` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `wrvu_p50` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `wrvu_p75` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `wrvu_p90` on the `SurveyData` table. All the data in the column will be lost.
  - Added the required column `data` to the `Survey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Survey` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SurveyData" DROP CONSTRAINT "SurveyData_surveyId_fkey";

-- DropIndex
DROP INDEX "SurveyData_geographic_region_idx";

-- DropIndex
DROP INDEX "SurveyData_provider_type_idx";

-- DropIndex
DROP INDEX "SurveyData_specialty_idx";

-- DropIndex
DROP INDEX "SurveyData_surveyId_idx";

-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "status",
DROP COLUMN "vendor",
DROP COLUMN "year",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SurveyData" DROP COLUMN "cf_p25",
DROP COLUMN "cf_p50",
DROP COLUMN "cf_p75",
DROP COLUMN "cf_p90",
DROP COLUMN "geographic_region",
DROP COLUMN "n_incumbents",
DROP COLUMN "n_orgs",
DROP COLUMN "provider_type",
DROP COLUMN "tcc_p25",
DROP COLUMN "tcc_p50",
DROP COLUMN "tcc_p75",
DROP COLUMN "tcc_p90",
DROP COLUMN "wrvu_p25",
DROP COLUMN "wrvu_p50",
DROP COLUMN "wrvu_p75",
DROP COLUMN "wrvu_p90",
ADD COLUMN     "cf" DOUBLE PRECISION,
ADD COLUMN     "tcc" DOUBLE PRECISION,
ADD COLUMN     "wrvu" DOUBLE PRECISION;

-- DropEnum
DROP TYPE "SurveyStatus";
