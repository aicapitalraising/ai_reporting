-- Creative Pipeline: creative_briefs and ad_scripts tables
-- Supports the flow: Meta performance data → creative brief → ad script → approval → production

-- ═══════════════════════════════════════════════
-- creative_briefs: AI-generated strategic creative briefs
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS creative_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Brief content
  title TEXT NOT NULL,
  objective TEXT,                         -- e.g., "Increase lead volume", "Reduce CPA"
  target_audience JSONB DEFAULT '{}',     -- demographics, interests, pain points
  messaging_angles JSONB DEFAULT '[]',    -- array of angle objects: { angle, hook, rationale }
  creative_direction TEXT,                -- visual/copy direction guidance
  platform TEXT DEFAULT 'meta',           -- meta, google, tiktok, multi
  ad_format TEXT,                         -- image, video, carousel, story

  -- Performance context that generated this brief
  source_campaigns JSONB DEFAULT '[]',    -- campaign IDs/names that informed this brief
  performance_snapshot JSONB DEFAULT '{}', -- spend, CPA, CTR, ROAS at time of generation
  generation_reason TEXT,                 -- "high_cpa", "fatigue", "scaling", "new_angle"

  -- Status lifecycle: pending → in_production → completed
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'completed', 'rejected')),
  rejection_reason TEXT,                  -- Captured on reject for AI feedback loop

  -- Metadata
  generated_by TEXT DEFAULT 'ai',         -- 'ai' or 'manual'
  approved_by UUID REFERENCES agency_members(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- ad_scripts: Production-ready ad scripts from briefs
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ad_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brief_id UUID REFERENCES creative_briefs(id) ON DELETE SET NULL,

  -- Script content
  title TEXT NOT NULL,
  headline TEXT,                           -- Primary headline
  headlines JSONB DEFAULT '[]',            -- Array of headline variants
  body_copy TEXT,                          -- Primary body text
  body_variants JSONB DEFAULT '[]',        -- Array of body copy variants
  cta TEXT,                                -- Call to action text
  hook TEXT,                               -- Opening hook (first 3 sec for video)
  script_body TEXT,                        -- Full video script if applicable
  platform TEXT DEFAULT 'meta',
  ad_format TEXT,                          -- image, video, carousel, story
  angle TEXT,                              -- Which messaging angle this script uses

  -- Status lifecycle: draft → approved → in_production → completed
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_production', 'completed', 'rejected')),
  rejection_reason TEXT,                  -- Captured on reject for AI feedback loop

  -- Performance tracking (filled after launch)
  linked_meta_ad_id UUID REFERENCES meta_ads(id) ON DELETE SET NULL,
  performance_metrics JSONB DEFAULT '{}',  -- CTR, CPA, ROAS after launch

  -- Metadata
  generated_by TEXT DEFAULT 'ai',
  approved_by UUID REFERENCES agency_members(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creative_briefs_client ON creative_briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_creative_briefs_status ON creative_briefs(client_id, status);
CREATE INDEX IF NOT EXISTS idx_ad_scripts_client ON ad_scripts(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_scripts_brief ON ad_scripts(brief_id);
CREATE INDEX IF NOT EXISTS idx_ad_scripts_status ON ad_scripts(client_id, status);

-- RLS
ALTER TABLE creative_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on creative_briefs" ON creative_briefs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public read creative_briefs" ON creative_briefs FOR SELECT TO public USING (true);
CREATE POLICY "Public insert creative_briefs" ON creative_briefs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update creative_briefs" ON creative_briefs FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ad_scripts" ON ad_scripts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public read ad_scripts" ON ad_scripts FOR SELECT TO public USING (true);
CREATE POLICY "Public insert ad_scripts" ON ad_scripts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update ad_scripts" ON ad_scripts FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Add anthropic_api_key to agency_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'anthropic_api_key'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN anthropic_api_key TEXT;
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_creative_briefs_updated_at
  BEFORE UPDATE ON creative_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_ad_scripts_updated_at
  BEFORE UPDATE ON ad_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
