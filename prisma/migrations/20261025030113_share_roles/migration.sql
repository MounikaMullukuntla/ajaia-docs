-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "DocumentShare" ADD COLUMN     "role" "ShareRole" NOT NULL DEFAULT 'VIEWER';
