/*
  Warnings:

  - You are about to drop the column `cf` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `tcc` on the `SurveyData` table. All the data in the column will be lost.
  - You are about to drop the column `wrvu` on the `SurveyData` table. All the data in the column will be lost.
  - Made the column `status` on table `Survey` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Survey" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "status" SET NOT NULL;

-- AlterTable
ALTER TABLE "SurveyData" DROP COLUMN "cf",
DROP COLUMN "tcc",
DROP COLUMN "wrvu",
ADD COLUMN     "cf_p25" DOUBLE PRECISION,
ADD COLUMN     "cf_p50" DOUBLE PRECISION,
ADD COLUMN     "cf_p75" DOUBLE PRECISION,
ADD COLUMN     "cf_p90" DOUBLE PRECISION,
ADD COLUMN     "geographic_region" TEXT,
ADD COLUMN     "n_incumbents" INTEGER,
ADD COLUMN     "n_orgs" INTEGER,
ADD COLUMN     "provider_type" TEXT,
ADD COLUMN     "tcc_p25" DOUBLE PRECISION,
ADD COLUMN     "tcc_p50" DOUBLE PRECISION,
ADD COLUMN     "tcc_p75" DOUBLE PRECISION,
ADD COLUMN     "tcc_p90" DOUBLE PRECISION,
ADD COLUMN     "wrvu_p25" DOUBLE PRECISION,
ADD COLUMN     "wrvu_p50" DOUBLE PRECISION,
ADD COLUMN     "wrvu_p75" DOUBLE PRECISION,
ADD COLUMN     "wrvu_p90" DOUBLE PRECISION;
