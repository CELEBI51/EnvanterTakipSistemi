/*
  Warnings:

  - You are about to drop the column `category` on the `accessories` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `hardware` table. All the data in the column will be lost.
  - Added the required column `category_id` to the `accessories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `hardware` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryParentType" AS ENUM ('Aksesuar', 'Varlık', 'Sarf Malzeme', 'Bileşen', 'Lisans');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('hardware', 'accessory', 'license', 'consumable', 'component', 'assignment', 'return');

-- CreateEnum
CREATE TYPE "AttachmentFileType" AS ENUM ('invoice', 'signed_form');

-- DropIndex
DROP INDEX "accessories_category_idx";

-- DropIndex
DROP INDEX "hardware_category_idx";

-- AlterTable
ALTER TABLE "accessories" DROP COLUMN "category",
ADD COLUMN     "category_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "hardware" DROP COLUMN "category",
ADD COLUMN     "category_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parent_type" "CategoryParentType" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "entity_type" "AttachmentEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "file_type" "AttachmentFileType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_parent_type_name_key" ON "categories"("parent_type", "name");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "accessories_category_id_idx" ON "accessories"("category_id");

-- CreateIndex
CREATE INDEX "hardware_category_id_idx" ON "hardware"("category_id");

-- AddForeignKey
ALTER TABLE "hardware" ADD CONSTRAINT "hardware_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
