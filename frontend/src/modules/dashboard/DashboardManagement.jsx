import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Bell,
  CalendarClock,
  GraduationCap,
  Loader2,
  RefreshCcw,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { getDashboardOverview, listRecentDashboardActivities } from '../../api/dashboard';
import {
  activityActionLabel,
  activityMetaPreview,
  buildAdmissionStages,
  buildDashboardMetrics,
  buildFeeBreakdown,
  emptyDashboardOverview,
  formatDashboardCurrency,
  formatDashboardDate,
  formatDashboardDateTime,
  normalizeDashboardOverview,
  summarizeDashboardOverview,
} from './dashboardUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || ADMIN_ROLES.has(user?.role) || permissions.includes(permission);
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">
      {message}
    </div>
  );
}

function SummaryCard({ icon, label, loading, value, helper }) {
  return (
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-2xl font-bold text-[#003434]">{loading ? '-' : value}</div>
      <div className="mt-1 text-xs font-semibold text-[#3f4848]">{loading ? '-' : helper}</div>
    </div>
  );
}

function MetricGrid({ loading, metrics }) {
  const icons = {
    students: <Users size={20} className="text-[#006a62]" />,
    staff: <GraduationCap size={20} className="text-[#006a62]" />,
    'fees-today': <Wallet size={20} className="text-[#006a62]" />,
    'fees-month': <TrendingUp size={20} className="text-[#006a62]" />,
    dues: <AlertCircle size={20} className="text-[#006a62]" />,
    results: <BadgeCheck size={20} className="text-[#006a62]" />,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <SummaryCard
          key={metric.id}
          icon={icons[metric.id] || <Activity size={20} className="text-[#006a62]" />}
          label={metric.label}
          loading={loading}
          value={metric.currency ? formatDashboardCurrency(metric.value) : metric.value}
          helper={metric.helper}
        />
      ))}
    </div>
  );
}

function ProgressList({ items, valueFormatter = (value) => value }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const percentage = Math.round((Number(item.value || 0) / maxValue) * 100);
        return (
          <div key={item.id} className="rounded-xl bg-white/40 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-bold text-[#071e27]">{item.label}</span>
              <b className="shrink-0 text-[#003434]">{valueFormatter(item.value)}</b>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/45">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(6, percentage)}%`, background: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingExams({ exams }) {
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#003434]">Upcoming Exams</h2>
          <p className="mt-1 text-xs font-semibold text-[#3f4848]">Next scheduled exams.</p>
        </div>
        <CalendarClock size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-3">
        {exams.map((exam) => (
          <div key={exam.id || `${exam.name}-${exam.startDate}`} className="rounded-xl bg-white/40 p-4">
            <div className="text-sm font-bold text-[#071e27]">{exam.name || '-'}</div>
            <div className="mt-2 text-xs font-semibold text-[#3f4848]">{formatDashboardDate(exam.startDate)}</div>
          </div>
        ))}
        {!exams.length && <EmptyState message="No upcoming exams available." />}
      </div>
    </section>
  );
}

function LatestNotices({ notices }) {
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#003434]">Latest Notices</h2>
          <p className="mt-1 text-xs font-semibold text-[#3f4848]">Most recent notices.</p>
        </div>
        <Bell size={19} className="text-[#006a62]" />
      </div>
      <div className="grid gap-3">
        {notices.map((notice) => (
          <div key={notice.id || `${notice.title}-${notice.createdAt}`} className="rounded-xl bg-white/40 p-4">
            <div className="text-sm font-bold text-[#071e27]">{notice.title || '-'}</div>
            <div className="mt-2 text-xs font-semibold text-[#3f4848]">{formatDashboardDateTime(notice.createdAt)}</div>
          </div>
        ))}
        {!notices.length && <EmptyState message="No notices available." />}
      </div>
    </section>
  );
}

function RecentActivities({ activities, loading }) {
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#003434]">Recent Activities</h2>
          <p className="mt-1 text-xs font-semibold text-[#3f4848]">Latest audit log entries.</p>
        </div>
        <Activity size={19} className="text-[#006a62]" />
      </div>
      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl bg-white/40 p-5 text-center text-sm font-semibold text-[#3f4848]">
            <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading activities...
          </div>
        )}
        {!loading && activities.map((activity) => {
          const meta = activityMetaPreview(activity.meta);
          return (
            <div key={activity.id} className="rounded-xl bg-white/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#071e27]">{activityActionLabel(activity.action)}</div>
                  <div className="mt-1 text-xs font-semibold text-[#3f4848]">
                    {[activity.entity, activity.entityId].filter(Boolean).join(' / ') || 'Audit log'}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#006a62]">
                  {activity.actorRole || '-'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-[#3f4848] sm:grid-cols-2">
                <span className="truncate">{activity.actorEmail || activity.actorUid || '-'}</span>
                <span className="sm:text-right">{formatDashboardDateTime(activity.at)}</span>
              </div>
              {meta && <div className="mt-2 text-xs font-semibold text-[#3f4848]">{meta}</div>}
            </div>
          );
        })}
        {!loading && !activities.length && <EmptyState message="No recent activities available." />}
      </div>
    </section>
  );
}

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
        listRecentDashboardActivities({ limit: 12 }),
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
    Promise.resolve().then(() => {
      if (active) loadDashboard();
    });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  if (!canView) {
    return (
      <div className="erp-dashboard-page">
        <EmptyState message="You do not have permission to view the dashboard." />
      </div>
    );
  }

  return (
    <div className="erp-dashboard-page">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#006a62]">Dashboard</p>
          <h1 className="mt-1 font-['Montserrat'] text-3xl font-bold text-[#003434]">Overview</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">Institution overview, notices, exams, and recent activities.</p>
          {overview.generatedAt && (
            <p className="mt-2 text-xs font-semibold text-[#3f4848]">Generated {formatDashboardDateTime(overview.generatedAt)}</p>
          )}
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d] disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
        </button>
      </div>

      <MetricGrid loading={loading} metrics={metrics} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-5">
          <section className="erp-glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#003434]">Admissions</h2>
                <p className="mt-1 text-xs font-semibold text-[#3f4848]">{summary.admissionWork} active admission items.</p>
              </div>
              <UserPlus size={19} className="text-[#006a62]" />
            </div>
            <ProgressList items={admissionStages} />
          </section>

          <section className="erp-glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#003434]">Fees</h2>
                <p className="mt-1 text-xs font-semibold text-[#3f4848]">Collected amounts and pending dues.</p>
              </div>
              <Wallet size={19} className="text-[#006a62]" />
            </div>
            <ProgressList items={feeBreakdown} valueFormatter={formatDashboardCurrency} />
          </section>
        </div>

        <RecentActivities activities={activities} loading={loading} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <UpcomingExams exams={overview.exams.upcoming} />
        <LatestNotices notices={overview.notices.latest} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Student Records', summary.studentRecords],
          ['Staff Records', summary.staffRecords],
          ['Upcoming Exams', summary.upcomingExams],
          ['Latest Notices', summary.latestNotices],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/35 bg-white/35 p-4 text-sm font-semibold text-[#3f4848]">
            <span className="block text-[11px] font-bold uppercase">{label}</span>
            <b className="mt-2 block text-xl text-[#003434]">{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
