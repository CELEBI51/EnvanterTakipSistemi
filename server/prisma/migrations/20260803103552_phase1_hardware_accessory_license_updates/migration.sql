/*
  Warnings:

  - You are about to drop the `software` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "software" DROP CONSTRAINT "software_assigned_hardware_id_fkey";

-- AlterTable
ALTER TABLE "accessories" ADD COLUMN     "invoice_no" TEXT,
ADD COLUMN     "purchase_amount" DECIMAL(12,2),
ADD COLUMN     "purchase_date" TIMESTAMP(3),
ADD COLUMN     "supplier" TEXT;

-- AlterTable
ALTER TABLE "hardware" ADD COLUMN     "invoice_no" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "purchase_amount" DECIMAL(12,2),
ADD COLUMN     "purchase_date" TIMESTAMP(3),
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "wifi_mac_address" TEXT;

-- DropTable
DROP TABLE "software";

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "min_threshold" INTEGER,
    "assigned_quantity" INTEGER NOT NULL DEFAULT 0,
    "available_quantity" INTEGER NOT NULL,
    "license_key" TEXT,
    "licensed_to" TEXT,
    "licensed_email" TEXT,
    "invoice_no" TEXT,
    "invoice_amount" DECIMAL(12,2),
    "purchase_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "licenses_end_date_idx" ON "licenses"("end_date");

-- CreateIndex
CREATE INDEX "licenses_category_id_idx" ON "licenses"("category_id");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
