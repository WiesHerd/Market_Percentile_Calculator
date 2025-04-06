/*
  Warnings:

  - You are about to drop the column `lastUsed` on the `survey_templates` table. All the data in the column will be lost.
  - You are about to drop the column `columns` on the `surveys` table. All the data in the column will be lost.
  - You are about to drop the `learning_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mapped_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `matching_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `specialty_mappings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `survey_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `unmapped_specialties` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "specialty_mappings" DROP CONSTRAINT "specialty_mappings_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "survey_data" DROP CONSTRAINT "survey_data_surveyId_fkey";

-- AlterTable
ALTER TABLE "survey_templates" DROP COLUMN "lastUsed";

-- AlterTable
ALTER TABLE "surveys" DROP COLUMN "columns",
ALTER COLUMN "specialtyMappings" SET DEFAULT '{}';

-- DropTable
DROP TABLE "learning_events";

-- DropTable
DROP TABLE "mapped_groups";

-- DropTable
DROP TABLE "matching_rules";

-- DropTable
DROP TABLE "specialty_mappings";

-- DropTable
DROP TABLE "survey_data";

-- DropTable
DROP TABLE "unmapped_specialties";

-- DropEnum
DROP TYPE "SurveyStatus";
