-- Fix: creators need UPDATE on their own subscription for upsert to work
CREATE POLICY "ps_creator_update" ON creator_pro_subscriptions
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Admin full access via profiles.is_admin flag too
CREATE POLICY "admin_full_pro_subs_profile" ON creator_pro_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );