import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Redirect } from 'expo-router';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';
import type { AdminReport } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  assigned: '#9C27B0',
  in_progress: '#F59E0B', // Amber
  resolved: '#10B981', // Emerald
};

const STATUS_BG_COLORS: Record<string, string> = {
  assigned: '#F3E5F5',
  in_progress: '#FEF3C7', // Light amber
  resolved: '#D1FAE5', // Light emerald
};

function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  onPress,
  total,
  trend,
  isHighlighted = false
}: { 
  icon: string; 
  label: string; 
  value: number; 
  color: string;
  onPress?: () => void;
  total?: number;
  trend?: number;
  isHighlighted?: boolean;
}) {
  const showTrend = trend !== undefined && trend !== 0;
  
  return (
    <TouchableOpacity
      style={[
        styles.statCard, 
        { 
          backgroundColor: color + '08', // Very subtle gradient-like background
          borderLeftWidth: 2,
          borderLeftColor: color + '40', // Subtle left accent
        },
        isHighlighted && styles.statCardHighlighted
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon as any} size={isHighlighted ? 36 : 32} color={color} />
        </View>
        {showTrend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#10B981' + '20' : '#EF4444' + '20' }]}>
            <MaterialCommunityIcons
              name={trend > 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend > 0 ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.trendText, { color: trend > 0 ? '#10B981' : '#EF4444' }]}>
              {Math.abs(trend)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, isHighlighted && styles.statValueHighlighted]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function getReportAge(createdAt: string): { text: string; color: string; isOverdue: boolean } {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 24) {
    return { text: `${diffInHours}h ago`, color: '#4CAF50', isOverdue: false };
  } else if (diffInDays === 1) {
    return { text: '1 day ago', color: '#FF9800', isOverdue: false };
  } else if (diffInDays < 7) {
    return { text: `${diffInDays} days ago`, color: '#FF9800', isOverdue: diffInDays > 3 };
  } else {
    return { text: `${diffInDays} days ago`, color: '#F44336', isOverdue: true };
  }
}

function ReportItem({ report, onPress, onQuickAction, isProcessing }: { 
  report: AdminReport; 
  onPress: () => void;
  onQuickAction?: (action: string, reportId: string) => void;
  isProcessing?: boolean;
}) {
  const statusColor = STATUS_COLORS[report.status] || colors.textSecondary;
  const statusBgColor = STATUS_BG_COLORS[report.status] || colors.surface;
  const priorityColor = report.severity === 'high' ? '#F44336' : report.severity === 'medium' ? '#FF9800' : '#4CAF50';
  const age = getReportAge(report.createdAt);
  const isStartAction = report.status === 'assigned';
  const isCompleteAction = report.status === 'in_progress';

  return (
    <TouchableOpacity style={styles.reportItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleContainer}>
          <Text style={styles.reportTitle} numberOfLines={2}>
            {report.title}
          </Text>
        </View>
        <View style={styles.reportHeaderRight}>
          <View style={[styles.ageBadge, { backgroundColor: age.color + '15' }]}>
            <MaterialCommunityIcons
              name={age.isOverdue ? 'alert-circle' : 'clock-outline'}
              size={10}
              color={age.color}
            />
            <Text style={[styles.ageText, { color: age.color }]}>
              {age.text}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {report.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.reportDescription} numberOfLines={2}>
        {report.description}
      </Text>
      <View style={styles.reportFooter}>
        <View style={styles.reportTags}>
          <View style={styles.reportTag}>
            <MaterialCommunityIcons
              name="tag-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.reportTagText}>
              {report.type.replace('_', ' ')}
            </Text>
          </View>
          <View style={[styles.reportTag, styles.priorityTag, { backgroundColor: priorityColor + '15' }]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={priorityColor}
            />
            <Text style={[styles.reportTagText, { color: priorityColor }]}>
              {report.severity}
            </Text>
          </View>
        </View>
        {report.status !== 'resolved' && onQuickAction && (
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              isStartAction && styles.quickActionButtonStart,
              isCompleteAction && styles.quickActionButtonComplete,
              isProcessing && styles.quickActionButtonProcessing,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isProcessing) {
                onQuickAction(isStartAction ? 'start' : 'complete', report.id);
              }
            }}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
            <MaterialCommunityIcons
                  name={isStartAction ? 'play-circle' : 'check-circle'}
                  size={18}
              color="#FFFFFF"
            />
            <Text style={styles.quickActionText}>
                  {isStartAction ? 'Start Work' : 'Mark Complete'}
            </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function OfficerDashboard() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const router = useRouter();
  const { user, isOfficer, loading: authLoading } = useAuth();

  useEffect(() => {
    // Only load reports if user is an officer
    if (isOfficer && user?.id) {
      loadReports();
    } else if (!isOfficer) {
      setLoading(false);
    }
  }, [user?.id, isOfficer]);

  async function loadReports() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.getAdminReports({
        assigneeId: user.id,
        limit: 100,
      });
      
      // Filter to only show reports assigned to current officer
      const assignedReports = response.data.filter(
        (r) => r.currentAssignment?.assignee?.id === user.id
      );
      setReports(assignedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const stats = {
    assigned: reports.filter((r) => r.status === 'assigned').length,
    inProgress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    urgent: reports.filter((r) => r.severity === 'high' && r.status !== 'resolved').length,
    total: reports.length,
  };

  // Calculate trends (simplified - in real app, compare with previous period)
  const trends = {
    assigned: 0, // Would calculate from previous period
    inProgress: 0,
    resolved: 0,
    urgent: 0,
  };

  // Get today's focus reports (top 3 urgent or oldest)
  const todaysFocus = [...reports]
    .filter((r) => r.status !== 'resolved')
    .sort((a, b) => {
      // Prioritize high severity
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (b.severity === 'high' && a.severity !== 'high') return 1;
      // Then by age (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 3);

  const handleQuickAction = async (action: string, reportId: string) => {
    try {
      setProcessingReportId(reportId);
      if (action === 'start') {
        await apiClient.updateReportStatus(reportId, {
          status: 'in_progress',
          note: 'Work started',
        });
      } else if (action === 'complete') {
        await apiClient.updateReportStatus(reportId, {
          status: 'resolved',
          note: 'Completed',
        });
      }
      await loadReports();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleStatPress = (status?: string) => {
    if (status) {
      router.push({
        pathname: '/(tabs)/reports',
        params: { filterStatus: status, viewMode: 'assigned' },
      } as any);
    }
  };

  // Don't render anything for citizens - redirect immediately
  if (!authLoading && !isOfficer) {
    return <Redirect href="/(tabs)/index" />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </View>
    );
  }

  if (loading && reports.length === 0 && user?.id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Officer Dashboard</Text>
                <Text style={styles.headerSubtitle}>
                  {`${reports.length} assigned ${reports.length === 1 ? 'report' : 'reports'}`}
                </Text>
              </View>
              
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="account-check"
            label="Assigned"
            value={stats.assigned}
            color="#9C27B0"
            total={stats.total}
            trend={trends.assigned}
            onPress={() => handleStatPress('assigned')}
          />
          <StatCard
            icon="progress-wrench"
            label="In Progress"
            value={stats.inProgress}
            color="#F59E0B"
            total={stats.total}
            trend={trends.inProgress}
            onPress={() => handleStatPress('in_progress')}
          />
        </View>
        <View style={styles.statsContainer}>
          <StatCard
            icon="check-circle"
            label="Resolved"
            value={stats.resolved}
            color="#10B981"
            total={stats.total}
            trend={trends.resolved}
            onPress={() => handleStatPress('resolved')}
            isHighlighted={true}
          />
          <StatCard
            icon="alert"
            label="Urgent"
            value={stats.urgent}
            color="#F44336"
            total={stats.total}
            trend={trends.urgent}
          />
        </View>

        {/* Performance Metrics */}
        {reports.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={20}
                  color={colors.buttonPrimary}
                />
                <Text style={styles.sectionTitle}>Performance</Text>
              </View>
            </View>
            <View style={styles.metricsContainer}>
              <View style={[styles.metricCard, { backgroundColor: colors.buttonPrimary + '08', borderLeftWidth: 2, borderLeftColor: colors.buttonPrimary + '40' }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: colors.buttonPrimary + '15' }]}>
                  <MaterialCommunityIcons name="chart-line" size={32} color={colors.buttonPrimary} />
                </View>
                <Text style={styles.metricValue}>
                  {stats.resolved > 0 && stats.total > 0
                    ? `${Math.round((stats.resolved / stats.total) * 100)}%`
                    : '0%'}
                </Text>
                <Text style={styles.metricLabel}>Completion Rate</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.buttonPrimary + '08', borderLeftWidth: 2, borderLeftColor: colors.buttonPrimary + '40' }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: colors.buttonPrimary + '15' }]}>
                  <MaterialCommunityIcons name="calendar-check" size={32} color={colors.buttonPrimary} />
                </View>
                <Text style={styles.metricValue}>
                  {reports.filter((r) => r.status === 'resolved').length}
                </Text>
                <Text style={styles.metricLabel}>Resolved This Week</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Focus */}
        {todaysFocus.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons
                    name="target"
                    size={20}
                    color={colors.buttonPrimary}
                  />
                  <Text style={styles.sectionTitle}>Today's Focus</Text>
                </View>
                <Text style={styles.focusSubtitle}>Top priority reports</Text>
              </View>
            </View>
            {todaysFocus.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onPress={() => router.push(`/report/${report.id}` as any)}
                onQuickAction={handleQuickAction}
                isProcessing={processingReportId === report.id}
              />
            ))}
          </View>
        )}

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/reports' as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No Assigned Reports</Text>
              <Text style={styles.emptyText}>
                You don't have any assigned reports yet.
              </Text>
            </View>
          ) : (
            reports.slice(0, 5).map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onPress={() => router.push(`/report/${report.id}` as any)}
                onQuickAction={handleQuickAction}
                isProcessing={processingReportId === report.id}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.lg + 8,
    paddingBottom: spacing.xl + 8,
  },
  header: {
    marginBottom: spacing.lg,
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.md + 4,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  headerContent: {
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
  },
  headerBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md + 2,
    backgroundColor: colors.buttonPrimary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.buttonPrimary + '30',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md + 2,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    ...shadows.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dividerLight,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statCardHighlighted: {
    transform: [{ scale: 1.02 }],
    ...shadows.xl,
  },
  statHeader: {
    marginBottom: spacing.xs,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  statValueHighlighted: {
    fontSize: 42,
    letterSpacing: -1.2,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
    marginLeft: 'auto',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  section: {
    marginTop: spacing.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md + 2,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  reportItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.dividerLight,
    ...shadows.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.buttonPrimary + '40',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  reportHeaderRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  ageText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  reportDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm + 2,
    lineHeight: 22,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  reportTags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  reportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    gap: 4,
  },
  priorityTag: {
    backgroundColor: 'transparent',
  },
  reportTagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  reportDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md + 2,
    gap: 8,
    ...shadows.md,
    minWidth: 120,
    justifyContent: 'center',
  },
  quickActionButtonStart: {
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  quickActionButtonComplete: {
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  quickActionButtonProcessing: {
    opacity: 0.7,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  focusSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
    marginTop: spacing.xs / 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dividerLight,
    ...shadows.lg,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md + 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginTop: spacing.md + 4,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});

