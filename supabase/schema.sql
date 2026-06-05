-- ================================================
-- ROTINAS — Schema do banco de dados (Supabase)
-- Execute este SQL no editor SQL do Supabase
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entradas do diário
CREATE TABLE IF NOT EXISTS diary_entries (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date           DATE NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  mood_score     INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  mood_keywords  TEXT[]       DEFAULT '{}',
  ai_feedback    TEXT,
  goals_planned  TEXT[]       DEFAULT '{}',
  goals_achieved TEXT[]       DEFAULT '{}',
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Consultas, exames e registros de saúde
CREATE TABLE IF NOT EXISTS health_records (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type         VARCHAR(50) NOT NULL CHECK (type IN ('medico','exame','medicamento','outro')),
  title        VARCHAR(255) NOT NULL,
  doctor_name  VARCHAR(255),
  specialty    VARCHAR(255),
  location     TEXT,
  scheduled_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Planos futuros (viagens, eventos, encontros)
CREATE TABLE IF NOT EXISTS future_plans (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title            VARCHAR(255) NOT NULL,
  category         VARCHAR(50) NOT NULL CHECK (category IN ('viagem','evento','encontro','outro')),
  description      TEXT,
  people_involved  TEXT[]       DEFAULT '{}',
  estimated_date   DATE,
  reminder_date    DATE,
  status           VARCHAR(50) DEFAULT 'ideia' CHECK (status IN ('ideia','planejando','confirmado','feito','cancelado')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Capturas rápidas (Marista Conecta, WhatsApp, etc.)
CREATE TABLE IF NOT EXISTS quick_captures (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content        TEXT NOT NULL,
  source         VARCHAR(100) DEFAULT 'manual',
  category       VARCHAR(50) CHECK (category IN ('tarefa','prova','evento','lembrete','outro')),
  scheduled_date DATE,
  processed      BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Row Level Security (RLS)
-- ================================================
ALTER TABLE diary_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário vê/edita apenas seus próprios dados
CREATE POLICY "diary_own"   ON diary_entries  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "health_own"  ON health_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "plans_own"   ON future_plans   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "capture_own" ON quick_captures FOR ALL USING (auth.uid() = user_id);

-- Googleトークン永続保存（モバイルでのカレンダー同期に必要）
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  google_access_token  TEXT,
  google_refresh_token TEXT,
  token_expiry         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_own" ON user_tokens FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- Índices para performance
-- ================================================
CREATE INDEX IF NOT EXISTS diary_user_date      ON diary_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS health_user_sched    ON health_records(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS plans_user_reminder  ON future_plans(user_id, reminder_date);
CREATE INDEX IF NOT EXISTS capture_user_proc    ON quick_captures(user_id, processed, created_at DESC);
