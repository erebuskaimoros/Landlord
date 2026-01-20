# Landlord Deployment Guide

This guide covers deploying the Landlord property management application to production.

## Prerequisites

- Supabase account and project
- Vercel account
- GitHub repository (for CI/CD)

## 1. Supabase Setup

### Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Note down:
   - Project URL: `https://<project-ref>.supabase.co`
   - Anon key: Found in Settings > API
   - Service role key: Found in Settings > API (keep secret)

### Apply Migrations

```bash
# Link to your Supabase project
supabase link --project-ref <project-ref>

# Push migrations to production
supabase db push
```

### Configure Authentication

1. Go to Authentication > Providers
2. Enable Email authentication
3. (Optional) Enable OAuth providers:
   - Google: Add OAuth credentials from Google Cloud Console
   - Apple: Add Sign in with Apple credentials

### Email Templates

1. Go to Authentication > Email Templates
2. Customize the following templates:
   - Confirmation email
   - Password reset email
   - Invitation email

### Storage Buckets (if using file uploads)

```sql
-- Create storage bucket for lease documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-documents', 'lease-documents', false);

-- RLS policies for storage
CREATE POLICY "Users can upload to their org" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lease-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
  )
);
```

## 2. Vercel Deployment

### Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Set the root directory to `app`

### Environment Variables

Add these in Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Build Settings

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Deploy

Push to your main branch to trigger deployment, or manually deploy from Vercel dashboard.

## 3. Post-Deployment Verification

### Checklist

- [ ] Authentication works (signup, login, logout)
- [ ] Protected routes redirect to login
- [ ] Data is properly isolated between organizations
- [ ] Audit logs are recording
- [ ] Dashboard loads with correct stats
- [ ] CRUD operations work for all entities
- [ ] Search functionality works

### Test RLS Policies

1. Create two test users in different organizations
2. Create test data for each organization
3. Verify User A cannot see User B's data
4. Test role permissions (viewer cannot edit, manager cannot delete)

## 4. Monitoring & Maintenance

### Supabase Dashboard

- Monitor database connections
- Check error logs
- Review API usage
- Set up database backups

### Vercel Analytics

- Enable Web Analytics for performance monitoring
- Set up error tracking with Sentry (optional)

### Database Maintenance

```sql
-- Vacuum and analyze for performance
VACUUM ANALYZE;

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 5. Scaling Considerations

### Database

- Upgrade Supabase plan as needed
- Enable connection pooling for high traffic
- Consider read replicas for heavy read workloads

### Frontend

- Enable Vercel Edge Functions for faster responses
- Configure CDN caching for static assets
- Use Next.js ISR for semi-static pages

### Performance

- Dashboard uses optimized RPC functions (`get_dashboard_stats`, `get_financial_totals`)
- GIN indexes for text search
- Composite indexes for common query patterns

## 6. Security Checklist

- [ ] RLS policies are enabled on all tables
- [ ] Audit triggers are recording all changes
- [ ] Auth emails are configured
- [ ] Service role key is never exposed to client
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

## Troubleshooting

### Common Issues

**Migration fails**
```bash
# Check migration status
supabase migration list

# View specific migration
supabase db diff
```

**RLS blocking queries**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test as specific user
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "<user-id>"}';
SELECT * FROM units;  -- Should only return user's org data
```

**Authentication issues**
- Verify redirect URLs in Supabase Auth settings
- Check browser console for auth errors
- Verify environment variables are correctly set

## Support

For issues:
1. Check Supabase logs
2. Check Vercel deployment logs
3. Review browser console errors
