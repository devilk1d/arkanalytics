
-- Migration to add nlp_red_flag column to predictions table
-- This is part of the v2.1 update for unified pipeline

ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS nlp_red_flag INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.predictions.nlp_red_flag IS '1 = hidden risk (tabular model predicts low churn but NLP sentiment is negative)';
