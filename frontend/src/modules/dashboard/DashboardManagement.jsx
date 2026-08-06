import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, BadgeCheck, GraduationCap, Loader2,
  RefreshCcw, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { getDashboardOverview, listRecentDashboardActivities } from '../../api/dashboard';
import {
  activityActionLabel, activityMetaPreview, buildAdmissionStages, buildDashboardMetrics,
  buildFeeBreakdown, emptyDashboardOverview, formatDashboardCurrency, formatDashboardDate,
  formatDashboardDateTime, normalizeDashboardOverview, summarizeDashboardOverview,
} from './dashboardUtils';
import { Card, StatTile, ProgressRow, ListRow, EmptyState } from '../../components/ui';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || ADMIN_ROLES.has(user?.role) || permissions.includes(permission);
}

// Icon + accent colour per metric tile.
const METRIC_STYLE = {
  students: { icon: Users, color: '#a78bfa' },
  staff: { icon: GraduationCap, color: '#57c4c9' },
  'fees-today': { icon: Wallet, color: '#f6b26b' },
  'fees-month': { icon: TrendingUp, color: '#f472b6' },
  dues: { icon: AlertCircle, color: '#1b6b74' },
  results: { icon: BadgeCheck, color: '#2e8c97' },
};

export default function DashboardManagement({ currentUser }) {
  const [overviewData, setOverviewData] = useState(emptyDashboardOverview);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'dashboard.view');
  const overview = useMemo(() => normalizeDashboardOverview(overviewData), [overviewData]);
  const metrics = useMemo(() => buildDashboardMetrics(overview), [overview]);
  const admissionStages = useMemo(() => buildAdmissionStages(overview.admissions), [overview.admissions]);
  const feeBreakdown = useMemo(() => buildFeeBreakdown(overview.fees), [overview.fees]);
  const summary = useMemo(() => summarizeDashboardOverview(overview), [overview]);

  const loadDashboard = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextOverview, nextActivities] = await Promise.all([
        getDashboardOverview(),
        listRecentDashboardActivities({ limit: 10 }),
      ]);
      setOverviewData(nextOverview || emptyDashboardOverview);
      setActivities(nextActivities);
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend dashboard.', error);
      setLoadError(error?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadDashboard(); });
    return () => { active = false; };
  }, [loadDashboard]);

  if (!canView) {
    return <Card><EmptyState message="You do not have permission to view the dashboard." /></Card>;
  }

  const admissionMax = Math.max(...admissionStages.map((s) => Number(s.value || 0)), 1);
  const feeMax = Math.max(...feeBreakdown.map((s) => Number(s.value || 0)), 1);

  return (
    <div className="flex flex-col gap-5">
      {loadError && (
        <div className="tt-card !py-3 text-[13px] font-medium text-neg">{loadError}</div>
      )}

      {/* Metric tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric) => {
          const style = METRIC_STYLE[metric.id] || { icon: Activity, color: '#2e8c97' };
          return (
            <StatTile
              key={metric.id}
              icon={style.icon}
              color={style.color}
              label={metric.label}
              value={loading ? '—' : (metric.currency ? formatDashboardCurrency(metric.value) : metric.value)}
            />
          );
        })}
      </div>

      {/* Admissions + Fees | Recent activity */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] items-start">
        <div className="flex flex-col gap-5">
          <Card title="Admissions">
            {admissionStages.length
              ? admissionStages.map((s) => <ProgressRow key={s.id} label={s.label} value={s.value} max={admissionMax} color={s.color} />)
              : <EmptyState message="No admission data." />}
          </Card>
          <Card title="Fees">
            {feeBreakdown.length
              ? feeBreakdown.map((s) => <ProgressRow key={s.id} label={s.label} value={s.value} max={feeMax} color={s.color} formatter={formatDashboardCurrency} />)
              : <EmptyState message="No fee data." />}
          </Card>
        </div>

        <Card title="Recent activity">
          {loading && <div className="text-center text-[13px] text-muted py-6"><Loader2 className="inline mr-2 animate-spin" size={16} /> Loading…</div>}
          {!loading && activities.map((a) => (
            <ListRow
              key={a.id}
              title={activityActionLabel(a.action)}
              subtitle={[a.actorRole, a.actorEmail || a.actorUid].filter(Boolean).join(' · ') || activityMetaPreview(a.meta) || 'Audit log'}
              right={formatDashboardDateTime(a.at)}
            />
          ))}
          {!loading && !activities.length && <EmptyState message="No recent activity." />}
        </Card>
      </div>

      {/* Exams + Notices */}
      <div className="grid gap-5 xl:grid-cols-2 items-start">
        <Card title="Upcoming exams">
          {overview.exams.upcoming.length
            ? overview.exams.upcoming.map((e) => <ListRow key={e.id || `${e.name}-${e.startDate}`} title={e.name || '—'} right={formatDashboardDate(e.startDate)} />)
            : <EmptyState message="No upcoming exams." />}
        </Card>
        <Card
          title="Latest notices"
          action={
            <button type="button" onClick={loadDashboard} disabled={loading} className="tt-link inline-flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Refresh
            </button>
          }
        >
          {overview.notices.latest.length
            ? overview.notices.latest.map((n) => <ListRow key={n.id || `${n.title}-${n.createdAt}`} title={n.title || '—'} right={formatDashboardDateTime(n.createdAt)} />)
            : <EmptyState message="No notices." />}
        </Card>
      </div>
    </div>
  );
}
