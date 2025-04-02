/*
  Warnings:

  - You are about to drop the column `name` on the `Survey` table. All the data in the column will be lost.
  - The `cf` column on the `SurveyData` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tcc` column on the `SurveyData` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `wrvu` column on the `SurveyData` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `vendor` to the `Survey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "name",
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "vendor" TEXT NOT NULL,
ADD COLUMN     "year" TEXT;

-- AlterTable
ALTER TABLE "SurveyData" DROP COLUMN "cf",
ADD COLUMN     "cf" JSONB,
DROP COLUMN "tcc",
ADD COLUMN     "tcc" JSONB,
DROP COLUMN "wrvu",
ADD COLUMN     "wrvu" JSONB;

-- AddForeignKey
ALTER TABLE "SurveyData" ADD CONSTRAINT "SurveyData_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
