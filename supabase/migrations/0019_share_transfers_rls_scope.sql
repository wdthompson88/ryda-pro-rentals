-- Tighten share_transfers email-match RLS so the policy only fires
-- on UNCLAIMED transfers (status='requested', to_user_id IS NULL).
-- Previously, the email-match clause stayed wide-open after a
-- transfer was claimed: if a recipient ever changed email or the
-- email got reused by a different account holder later (employer
-- domain churn, divorce, etc.), the new owner of that mailbox
-- could read historical transfer rows — asset, share count, sender
-- identity, member_note, ryda_review_note. Codex round-5 catch.
--
-- After this migration: a) the recipient still reads pre-claim
-- (status='requested', to_user_id IS NULL); b) once claimed
-- (to_user_id is set), only that to_user_id can read it; c) the
-- sender always reads via from_user_id = auth.uid().

drop policy if exists "users can read incoming transfers" on public.share_transfers;
create policy "users can read incoming transfers"
  on public.share_transfers
  for select
  to authenticated
  using (
    to_user_id = auth.uid()
    or (
      status = 'requested'
      and to_user_id is null
      and lower(to_user_email) = lower((auth.jwt() ->> 'email'))
    )
  );
