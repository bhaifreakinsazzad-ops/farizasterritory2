-- ==============================================================================
-- Rollback Script for 03_handover_reconciliation.sql
-- Removes added tables/functions while preserving customer orders & approved SKUs.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.ft_transition_order_inventory(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ft_create_order_atomic(JSONB);
DROP FUNCTION IF EXISTS public.ft_claim_capi_outbox(INTEGER);

DROP POLICY IF EXISTS "capi_outbox_staff_read" ON public.capi_outbox;
DROP TABLE IF EXISTS public.capi_outbox;

DROP POLICY IF EXISTS "audit_logs_staff_select" ON public.audit_logs;
DROP TABLE IF EXISTS public.audit_logs;
