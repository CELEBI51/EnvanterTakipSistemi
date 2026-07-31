-- AlterTable
ALTER TABLE "hardware" ADD COLUMN     "warranty_end_date" TIMESTAMP(3),
ADD COLUMN     "warranty_start_date" TIMESTAMP(3),
ALTER COLUMN "model" DROP NOT NULL;
