-- This is an empty migration.
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
