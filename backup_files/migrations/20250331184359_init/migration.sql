/*
  Warnings:

  - You are about to drop the column `status` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `geographic_region` on the `survey_data` table. All the data in the column will be lost.
  - You are about to drop the column `n_incumbents` on the `survey_data` table. All the data in the column will be lost.
  - You are about to drop the column `n_orgs` on the `survey_data` table. All the data in the column will be lost.
  - You are about to drop the column `provider_type` on the `survey_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "survey_data" DROP COLUMN "geographic_region",
DROP COLUMN "n_incumbents",
DROP COLUMN "n_orgs",
DROP COLUMN "provider_type";

-- DropEnum
DROP TYPE "SurveyStatus";
