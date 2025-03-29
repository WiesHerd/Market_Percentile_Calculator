-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SurveyStatus" NOT NULL DEFAULT 'PROCESSING',
    "columnMappings" JSONB NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_data" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "providerType" TEXT,
    "region" TEXT,
    "nOrgs" INTEGER,
    "nIncumbents" INTEGER,
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

    CONSTRAINT "survey_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_mappings" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "sourceSpecialty" TEXT NOT NULL,
    "mappedSpecialty" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "specialty_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceSpecialty" TEXT NOT NULL,
    "targetSpecialty" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendor" TEXT,
    "patterns" JSONB,
    "chainedSpecialties" JSONB,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_rules" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastApplied" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "matchType" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "vendorContext" JSONB,

    CONSTRAINT "matching_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapped_groups" (
    "id" TEXT NOT NULL,
    "specialties" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSingleSource" BOOLEAN,

    CONSTRAINT "mapped_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unmapped_specialties" (
    "id" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unmapped_specialties_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_data" ADD CONSTRAINT "survey_data_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_mappings" ADD CONSTRAINT "specialty_mappings_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
