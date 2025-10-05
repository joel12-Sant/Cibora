-- Idempotent rename: si "password" existe -> renómbralo; si no, asegura "passwordHash"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
  ELSE
    -- En algunos estados la columna ya fue creada y renombrada antes.
    -- Aseguramos que exista "passwordHash" para que el esquema quede consistente.
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
  END IF;
END $$;
