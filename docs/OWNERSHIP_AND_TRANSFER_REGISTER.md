# Fariza's Territory — Ownership & Access Transfer Register

> Complete every checklist item below before closing handover. Do **not** share raw secrets or passwords inside GitHub or Markdown files.

| System / Asset | Target Owner Account | Transfer Method | Current Sandbox / Engineering Status | Owner Verified? |
|---|---|---|---|---|
| **GitHub Repository** | Client GitHub Organization / Owner Account (`notrealenginellc/Fariza-s-Territory` or transferred target repo) | GitHub **Settings ➔ Transfer ownership** + remove temporary agency collaborators; configure branch protection on `main` | Ready for release merge from branch `release/client-handover-v1` | [ ] Pending Client |
| **Domain Name & DNS (`farizasterritory.com`)** | Client Registrar & DNS Account (Cloudflare / Registrar) | Verify registrar login, 2FA enabled, `A` / `CNAME` pointing to live Node host, TLS SSL active | External to workspace (`farizasterritory.com` referenced in canonical SEO) | [ ] Pending Client |
| **Supabase Organization & Project (`vjbhrdclcnxevunskodm`)** | Client Owner Email | Transfer Supabase Organization ownership; enable MFA; run `02_security_hardening.sql`, `03_handover_reconciliation.sql`, `seed.sql`, `rls_security.test.sql`; create `auth.users` + `public.staff_users` | SQL files & RLS tests ready in `supabase/`; **not executed** from this workspace | [ ] Pending Client |
| **Supabase Storage Bucket (`product-media`)** | Same Supabase Project (`vjbhrdclcnxevunskodm`) | Public read bucket created automatically on first CMS upload or via SQL Editor; verify Storage policies match `03_handover_reconciliation.sql` | Auto-create + fallback `/assets/uploads/<SKU>/` tested cleanly | [ ] Pending Client |
| **Hosting & Runtime (Node 20+)** | Client Railway / Render / Fly.io / VPS account | Connect GitHub repo, set env vars from `.env.example`, start command `npm start`, rotate secrets if ever shared | Verified locally & in headless Edge E2E; **not deployed live** from sandbox | [ ] Pending Client |
| **Meta Business Manager / Pixel / CAPI (`1657670575734647`)** | Client Business Portfolio | Client generates System User `META_CAPI_ACCESS_TOKEN`, enters into hosting env vars (never client HTML), tests via **Admin ➔ Settings ➔ Send Admin Test CAPI Event**, verifies catalog feed `/api/catalog-feed.csv` | Token absent in sandbox (`preview_no_token`); outbox retry tested with mock Graph responses | [ ] Pending Client |
| **Official Communication Channels** | Client Page `farizasterritory143` + WhatsApp Business SIM | Enter real verified BD WhatsApp Business number in **Admin ➔ Store Settings**; remove agency page admin roles if any | Placeholder `8801700000000` disabled; defaults to official Messenger `m.me/farizasterritory143` | [ ] Pending Client |
| **Courier Portal (Steadfast / Pathao / RedX)** | Client Courier Merchant Account | Confirm merchant credentials & return pickup address in Mirpur, Dhaka | Export CSV & Courier one-click formatter active in `/admin` | [ ] Pending Client |

---

## Mandatory First-Hour Owner Tasks After Transfer

1. Change database/hosting/Supabase/Meta passwords or rotate **`SUPABASE_SERVICE_ROLE_KEY`** and **`META_CAPI_ACCESS_TOKEN`**.
2. Remove temporary developer access from GitHub, Supabase Organization, Hosting Dashboard, and Meta Business Portfolio once verification is signed.
3. Confirm only approved owner email(s) hold `role = 'admin'` in `public.staff_users` (`SELECT email, role, is_active FROM public.staff_users;`).
4. Execute `docs/SELLER_53_SKU_LEDGER.csv` sign-off -> apply pricing & verified stock counts before activating Meta Ads.
