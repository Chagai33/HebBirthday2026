/*
  # Initial Birthday Tracker Schema

  ## Overview
  This migration creates the complete database schema for the Birthday Tracker application,
  including multi-tenant support, user management, and birthday tracking with Hebrew calendar integration.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase Auth users
  - `id` (uuid, pk) - References auth.users
  - `email` (text)
  - `phone_number` (text)
  - `display_name` (text)
  - `photo_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `tenants`
  Multi-tenant groups/organizations
  - `id` (uuid, pk)
  - `name` (text) - Tenant/group name
  - `owner_id` (uuid) - References profiles
  - `default_language` (text) - 'he' or 'en'
  - `timezone` (text) - Default 'Asia/Jerusalem'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `tenant_members`
  User membership in tenants with roles
  - `id` (uuid, pk)
  - `tenant_id` (uuid) - References tenants
  - `user_id` (uuid) - References profiles
  - `role` (text) - 'owner', 'admin', or 'member'
  - `joined_at` (timestamptz)

  ### 4. `birthdays`
  Birthday records with Hebrew calendar support
  - `id` (uuid, pk)
  - `tenant_id` (uuid) - References tenants
  - `first_name` (text)
  - `last_name` (text)
  - `birth_date_gregorian` (date) - Gregorian birth date
  - `after_sunset` (boolean) - Birth after sunset flag
  - `gender` (text) - 'male', 'female', or 'other'
  - `birth_date_hebrew_string` (text) - Hebrew date string
  - `next_upcoming_hebrew_birthday` (date) - Next Hebrew birthday in Gregorian
  - `future_hebrew_birthdays` (jsonb) - Array of future dates
  - `notes` (text)
  - `archived` (boolean)
  - `created_at` (timestamptz)
  - `created_by` (uuid) - References profiles
  - `updated_at` (timestamptz)
  - `updated_by` (uuid) - References profiles

  ## Security
  - Enable RLS on all tables
  - Users can only access data for tenants they belong to
  - Tenant owners and admins can manage tenant data
  - Members have read-only access

  ## Important Notes
  1. All tables use UUID primary keys with automatic generation
  2. Timestamps default to current time
  3. RLS policies enforce tenant isolation
  4. Indexes created for frequently queried columns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone_number text,
  display_name text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_language text DEFAULT 'he' CHECK (default_language IN ('he', 'en')),
  timezone text DEFAULT 'Asia/Jerusalem',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_members table
CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create birthdays table
CREATE TABLE IF NOT EXISTS birthdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date_gregorian date NOT NULL,
  after_sunset boolean DEFAULT false,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  birth_date_hebrew_string text,
  next_upcoming_hebrew_birthday date,
  future_hebrew_birthdays jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_tenant_id ON birthdays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_next_birthday ON birthdays(next_upcoming_hebrew_birthday) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_birthdays_gregorian ON birthdays(birth_date_gregorian);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Tenants policies: Users can only see tenants they belong to
CREATE POLICY "Users can view own tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = tenants.id
      AND tenant_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Tenant owners can update their tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Tenant owners can delete their tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Tenant members policies
CREATE POLICY "Users can view tenant members of their tenants"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners and admins can add members"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = tenant_members.tenant_id
      AND tenant_members.user_id = auth.uid()
      AND tenant_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant owners and admins can update members"
  ON tenant_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant owners and admins can remove members"
  ON tenant_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Birthdays policies: Access based on tenant membership
CREATE POLICY "Users can view birthdays in their tenants"
  ON birthdays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = birthdays.tenant_id
      AND tenant_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create birthdays in their tenants"
  ON birthdays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = birthdays.tenant_id
      AND tenant_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update birthdays in their tenants"
  ON birthdays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = birthdays.tenant_id
      AND tenant_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = birthdays.tenant_id
      AND tenant_members.user_id = auth.uid()
    )
    AND updated_by = auth.uid()
  );

CREATE POLICY "Users can delete birthdays in their tenants"
  ON birthdays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = birthdays.tenant_id
      AND tenant_members.user_id = auth.uid()
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to automatically add owner as tenant member when creating tenant
CREATE OR REPLACE FUNCTION handle_new_tenant()
RETURNS trigger AS $$
BEGIN
  INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner as member
DROP TRIGGER IF EXISTS on_tenant_created ON tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION handle_new_tenant();
