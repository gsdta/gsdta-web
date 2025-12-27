import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { adminGetClasses, AdminClass } from '@gsdta/shared-core';

export default function ClassesScreen() {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      setError(null);
      const data = await adminGetClasses({ status: 'active' });
      setClasses(data.classes);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses();
  }, [fetchClasses]);

  const renderClass = ({ item }: { item: AdminClass }) => (
    <TouchableOpacity style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={styles.classIcon}>
          <FontAwesome name="book" size={20} color="#4F46E5" />
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classGrade}>{item.gradeName}</Text>
        </View>
        <View style={styles.enrollmentBadge}>
          <Text style={styles.enrollmentText}>
            {item.enrolled}/{item.capacity}
          </Text>
        </View>
      </View>
      {item.teacherName && (
        <View style={styles.teacherRow}>
          <FontAwesome name="user" size={14} color="#6B7280" />
          <Text style={styles.teacherName}>{item.teacherName}</Text>
        </View>
      )}
      <View style={styles.scheduleRow}>
        <FontAwesome name="clock-o" size={14} color="#6B7280" />
        <Text style={styles.scheduleText}>
          {item.day} {item.time}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchClasses}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="book" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No classes found</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={classes}
      keyExtractor={(item) => item.id}
      renderItem={renderClass}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  classCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
  },
  classGrade: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  enrollmentBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  enrollmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  teacherName: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  scheduleText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});
