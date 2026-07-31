-- CreateTable
CREATE TABLE "accessories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "assigned_quantity" INTEGER NOT NULL DEFAULT 0,
    "out_of_use_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_threshold" INTEGER,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

-- CHECK Constraint: total_quantity = available_quantity + assigned_quantity + out_of_use_quantity
ALTER TABLE "accessories" ADD CONSTRAINT "chk_accessory_quantities" CHECK (total_quantity = available_quantity + assigned_quantity + out_of_use_quantity);

-- CreateTable
CREATE TABLE "accessory_stock_movements" (
    "id" UUID NOT NULL,
    "accessory_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessory_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accessories_category_idx" ON "accessories"("category");

-- CreateIndex
CREATE INDEX "accessory_stock_movements_accessory_id_idx" ON "accessory_stock_movements"("accessory_id");

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_stock_movements" ADD CONSTRAINT "accessory_stock_movements_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_stock_movements" ADD CONSTRAINT "accessory_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
