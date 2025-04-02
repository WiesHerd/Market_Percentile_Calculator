-- AlterTable
ALTER TABLE "survey_data" ADD COLUMN     "geographic_region" TEXT,
ADD COLUMN     "n_incumbents" INTEGER,
ADD COLUMN     "n_orgs" INTEGER,
ADD COLUMN     "provider_type" TEXT;
