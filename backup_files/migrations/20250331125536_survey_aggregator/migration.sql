-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyData" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "geographic_region" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyData_surveyId_idx" ON "SurveyData"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyData_specialty_idx" ON "SurveyData"("specialty");

-- CreateIndex
CREATE INDEX "SurveyData_provider_type_idx" ON "SurveyData"("provider_type");

-- CreateIndex
CREATE INDEX "SurveyData_geographic_region_idx" ON "SurveyData"("geographic_region");

-- AddForeignKey
ALTER TABLE "SurveyData" ADD CONSTRAINT "SurveyData_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
