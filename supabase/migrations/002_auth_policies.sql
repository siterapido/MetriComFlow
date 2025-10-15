-- Strengthen SELECT RLS and create profile trigger on user signup

-- =====================================
-- Function & Trigger: Create profile on auth.users insert
-- =====================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================
-- Harden SELECT policies: require authenticated users
-- =====================================
ALTER POLICY "Users can view all profiles"
  ON public.profiles
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view team members"
  ON public.team_members
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view leads"
  ON public.leads
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view labels"
  ON public.labels
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view lead labels"
  ON public.lead_labels
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view checklist items"
  ON public.checklist_items
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view comments"
  ON public.comments
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view attachments"
  ON public.attachments
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view lead activity"
  ON public.lead_activity
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view client goals"
  ON public.client_goals
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view revenue records"
  ON public.revenue_records
  USING (auth.uid() IS NOT NULL);

ALTER POLICY "Anyone can view stopped sales"
  ON public.stopped_sales
  USING (auth.uid() IS NOT NULL);