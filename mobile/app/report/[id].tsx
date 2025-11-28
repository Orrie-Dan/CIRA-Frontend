import { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity,
  Linking,
  Share,
  Platform,
  Pressable,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';
import type { Report, DetailedReport } from '../../types';
import StatusUpdateModal from '../../components/StatusUpdateModal';

// Get API base URL - use the same one as apiClient
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://cira-backend-1.onrender.com';

const { width } = Dimensions.get('window');

const STATUS_COLORS: Record<string, string> = {
  new: '#2196F3',
  triaged: '#FF9800',
  assigned: '#9C27B0',
  in_progress: '#F44336',
  resolved: '#4CAF50',
  rejected: '#9E9E9E',
};

const STATUS_BG_COLORS: Record<string, string> = {
  new: '#E3F2FD',
  triaged: '#FFF3E0',
  assigned: '#F3E5F5',
  in_progress: '#FFEBEE',
  resolved: '#E8F5E9',
  rejected: '#F5F5F5',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

const PRIORITY_BG_COLORS: Record<string, string> = {
  low: '#E8F5E9',
  medium: '#FFF3E0',
  high: '#FFEBEE',
};

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | DetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const router = useRouter();
  const { user, isOfficer } = useAuth();

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use detailed report for officers, regular report for citizens
      const data = isOfficer
        ? await apiClient.getDetailedReport(id)
        : await apiClient.getReport(id);
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = () => {
    loadReport();
  };

  const handleShare = async () => {
    if (!report) return;
    try {
      await Share.share({
        message: `${report.title}\n\n${report.description}\n\nLocation: ${report.addressText || 'N/A'}`,
        title: report.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleNavigate = () => {
    if (!report) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${report.latitude},${report.longitude}`,
      android: `geo:0,0?q=${report.latitude},${report.longitude}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`
        );
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Report not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[report.status] || '#9E9E9E';
  const statusBgColor = STATUS_BG_COLORS[report.status] || '#F5F5F5';
  const priorityColor = PRIORITY_COLORS[report.severity] || '#666666';
  const priorityBgColor = PRIORITY_BG_COLORS[report.severity] || '#F5F5F5';

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
          <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButtonHeader} 
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleNavigate}>
            <MaterialCommunityIcons name="navigation" size={22} color={colors.buttonPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View style={styles.card}>
          {/* Title and Status */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{report.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
              {report.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: '#F3F4F6' }]}>
              <MaterialCommunityIcons name="tag" size={14} color={colors.textSecondary} />
              <Text style={styles.tagText}>
                {report.type.replace('_', ' ').charAt(0).toUpperCase() + report.type.replace('_', ' ').slice(1)}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: priorityBgColor }]}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={14}
                color={priorityColor}
              />
              <Text style={[styles.tagText, { color: priorityColor }]}>
                {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{report.description}</Text>
          </View>

          {/* Location */}
          {report.addressText && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Pressable style={styles.locationCard} onPress={handleNavigate}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={20} 
                  color={colors.buttonPrimary} 
                />
                <View style={styles.locationContent}>
                  <Text style={styles.addressText}>{report.addressText}</Text>
              {(report.province || report.district || report.sector) && (
                    <Text style={styles.locationDetails}>
                  {[report.province, report.district, report.sector]
                    .filter(Boolean)
                        .join(' • ')}
                </Text>
              )}
                </View>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={20} 
                  color={colors.textTertiary} 
                />
              </Pressable>
            </View>
          )}

          {/* Latest Update */}
          {report.latestStatus && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Latest Update</Text>
              <View style={styles.updateCard}>
                <Text style={styles.updateText}>{report.latestStatus.note}</Text>
                <Text style={styles.updateDate}>
                {new Date(report.latestStatus.changedAt).toLocaleString()}
              </Text>
              </View>
            </View>
          )}

          {/* Officer-specific sections */}
          {isOfficer && 'statusHistory' in report && (
            <>
              {/* Status Update Button */}
              {report.status !== 'resolved' && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.statusUpdateButton}
                    onPress={() => setStatusModalVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name="update"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.statusUpdateButtonText}>Update Status</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Status History */}
              {report.statusHistory && report.statusHistory.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Status History</Text>
                  {report.statusHistory.map((history, index) => (
                    <View key={history.id} style={styles.historyItem}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyContent}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyStatus}>
                            {history.fromStatus ? `${history.fromStatus} → ` : ''}
                            {history.toStatus}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(history.createdAt).toLocaleString()}
                          </Text>
                        </View>
                        {history.note && (
                          <Text style={styles.historyNote}>{history.note}</Text>
                        )}
                        {history.changedBy && (
                          <Text style={styles.historyChangedBy}>
                            by {history.changedBy.fullName || history.changedBy.email}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Comments */}
              {report.comments && report.comments.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Comments ({report.comments.length})
                  </Text>
                  {report.comments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                      <View style={styles.commentFooter}>
                        {comment.author && (
                          <Text style={styles.commentAuthor}>
                            {comment.author.fullName || comment.author.email}
                          </Text>
                        )}
                        <Text style={styles.commentDate}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Assignment Info */}
              {report.currentAssignment && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Assignment</Text>
                  <View style={styles.assignmentCard}>
                    {report.currentAssignment.assignee && (
                      <View style={styles.assignmentRow}>
                        <MaterialCommunityIcons
                          name="account"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.assignmentText}>
                          {report.currentAssignment.assignee.fullName ||
                            report.currentAssignment.assignee.email}
                        </Text>
                      </View>
                    )}
                    {report.currentAssignment.organization && (
                      <View style={styles.assignmentRow}>
                        <MaterialCommunityIcons
                          name="office-building"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.assignmentText}>
                          {report.currentAssignment.organization.name}
                        </Text>
                      </View>
                    )}
                    {report.currentAssignment.dueAt && (
                      <View style={styles.assignmentRow}>
                        <MaterialCommunityIcons
                          name="calendar-clock"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.assignmentText}>
                          Due: {new Date(report.currentAssignment.dueAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={16} 
                color={colors.textTertiary} 
              />
              <Text style={styles.metadataText}>
                Created {new Date(report.createdAt).toLocaleDateString()}
          </Text>
            </View>
            {report.reporterId === user?.id && (
              <View style={styles.metadataItem}>
                <MaterialCommunityIcons 
                  name="account" 
                  size={16} 
                  color={colors.textTertiary} 
                />
                <Text style={styles.metadataText}>Your Report</Text>
              </View>
            )}
          </View>
        </View>

        {/* Photos Section */}
      {report.photos && report.photos.length > 0 && (
        <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>
            Photos ({report.photos.length})
          </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
            >
            {report.photos.map((photo) => {
              // Construct photo URL - handle both absolute and relative URLs
              let photoUrl = '';
              if (photo.url) {
                if (photo.url.startsWith('http://') || photo.url.startsWith('https://')) {
                  // Already absolute URL
                  photoUrl = photo.url;
                } else if (photo.url.startsWith('/')) {
                  // Relative URL starting with /
                  photoUrl = `${API_BASE}${photo.url}`;
                } else {
                  // Relative URL without leading /
                  photoUrl = `${API_BASE}/${photo.url}`;
                }
              }
              
              if (!photoUrl) {
                if (__DEV__) {
                  console.warn('Invalid photo URL for photo:', photo);
                }
                return null;
              }
              
              return (
                <Image
                  key={photo.id}
                  source={{ uri: photoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                  onError={(e) => {
                    if (__DEV__) {
                      console.log('Image load error for URL:', photoUrl, 'Error:', e.nativeEvent.error);
                    }
                  }}
                  onLoad={() => {
                    if (__DEV__) {
                      console.log('Image loaded successfully:', photoUrl);
                    }
                  }}
                />
              );
            }).filter(Boolean)}
          </ScrollView>
        </View>
      )}
    </ScrollView>

      {/* Status Update Modal */}
      {isOfficer && report && (
        <StatusUpdateModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          reportId={report.id}
          currentStatus={report.status}
          onSuccess={handleStatusUpdate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg + 8,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
    ...shadows.sm,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dividerLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily,
  },
  backButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dividerLight,
    ...shadows.md,
  },
  titleSection: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    lineHeight: 32,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dividerLight,
    gap: spacing.sm,
  },
  locationContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  locationDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  updateCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dividerLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.buttonPrimary,
  },
  updateText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  updateDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dividerLight,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metadataText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  photosSection: {
    marginTop: spacing.sm,
  },
  photosContainer: {
    paddingRight: spacing.md,
  },
  photo: {
    width: width - spacing.md * 3,
    height: 280,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    backgroundColor: colors.dividerLight,
  },
  statusUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  statusUpdateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.buttonPrimary,
    marginRight: spacing.md,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dividerLight,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  historyNote: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  historyChangedBy: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  commentCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dividerLight,
  },
  commentBody: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
  },
  commentDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dividerLight,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  assignmentText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});

