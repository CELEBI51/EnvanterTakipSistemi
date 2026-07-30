-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'it_staff', 'viewer');

-- CreateEnum
CREATE TYPE "HardwareStatus" AS ENUM ('Hazır', 'Kullanımda', 'Arızalı', 'Serviste', 'Kullanım Dışı');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('Aktif', 'Kısmi İade', 'İade Edildi');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "tc_no" CHAR(11) NOT NULL,
    "department" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hardware" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial_no" TEXT NOT NULL,
    "demirbas_no" TEXT NOT NULL,
    "specs" JSONB,
    "status" "HardwareStatus" NOT NULL DEFAULT 'Hazır',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "assigned_hardware_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "teslim_eden" TEXT NOT NULL,
    "employee_id" UUID NOT NULL,
    "teslim_tarihi" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'Aktif',
    "pdf_url" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_items" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "hardware_id" UUID NOT NULL,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "return_date" TIMESTAMP(3),

    CONSTRAINT "assignment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "teslim_alan_ic" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_items" (
    "id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "hardware_id" UUID NOT NULL,
    "result_status" "HardwareStatus" NOT NULL,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "related_id" TEXT,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tc_no_key" ON "employees"("tc_no");

-- CreateIndex
CREATE INDEX "employees_tc_no_idx" ON "employees"("tc_no");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE UNIQUE INDEX "hardware_demirbas_no_key" ON "hardware"("demirbas_no");

-- CreateIndex
CREATE INDEX "hardware_status_idx" ON "hardware"("status");

-- CreateIndex
CREATE INDEX "hardware_category_idx" ON "hardware"("category");

-- CreateIndex
CREATE INDEX "software_end_date_idx" ON "software"("end_date");

-- CreateIndex
CREATE INDEX "assignments_employee_id_idx" ON "assignments"("employee_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- AddForeignKey
ALTER TABLE "hardware" ADD CONSTRAINT "hardware_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software" ADD CONSTRAINT "software_assigned_hardware_id_fkey" FOREIGN KEY ("assigned_hardware_id") REFERENCES "hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_hardware_id_fkey" FOREIGN KEY ("hardware_id") REFERENCES "hardware"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_hardware_id_fkey" FOREIGN KEY ("hardware_id") REFERENCES "hardware"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial Unique Index: A hardware item can have at most one active (returned = false) assignment item
CREATE UNIQUE INDEX "assignment_items_hardware_id_active_unique" ON "assignment_items"("hardware_id") WHERE "returned" = false;

-- Check constraint: tc_no must consist of exactly 11 numeric digits
ALTER TABLE "employees" ADD CONSTRAINT "employees_tc_no_check" CHECK ("tc_no" ~ '^[0-9]{11}$');

