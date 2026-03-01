-- Create new enum type first
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CARETAKER', 'PARENT');

-- Map existing roles to new simplified roles via text cast
-- OWNER, DIRECTOR → ADMIN
-- TEACHER, STAFF → CARETAKER
-- ADMIN → ADMIN (no change)
-- PARENT → PARENT (no change)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'ADMIN'
      WHEN 'DIRECTOR' THEN 'ADMIN'
      WHEN 'TEACHER' THEN 'CARETAKER'
      WHEN 'STAFF' THEN 'CARETAKER'
      ELSE "role"::text
    END
  )::"UserRole_new";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PARENT';

-- Drop old enum and rename new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Add joinCode column to Center
ALTER TABLE "Center" ADD COLUMN "joinCode" TEXT;
CREATE UNIQUE INDEX "Center_joinCode_key" ON "Center"("joinCode");
