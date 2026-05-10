
CREATE TABLE IF NOT EXISTS public.system_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'error',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_errors_created ON public.system_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_func ON public.system_errors(function_name);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "se_admin_read" ON public.system_errors
FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));
