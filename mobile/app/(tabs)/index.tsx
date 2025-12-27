import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuth } from '../../src/auth/provider';

export default function DashboardScreen() {
  const { user } = useAuth();

  const isAdminOrTeacher =
    user?.role === 'admin' || user?.role === 'teacher';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'parent'}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <Link href="/(tabs)/students" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <FontAwesome name="users" size={24} color="#4F46E5" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Students</Text>
              <Text style={styles.actionDescription}>
                View enrolled students and their details
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </Link>

        {isAdminOrTeacher && (
          <Link href="/(tabs)/classes" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <FontAwesome name="book" size={24} color="#059669" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Classes</Text>
                <Text style={styles.actionDescription}>
                  Manage classes and attendance
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Link>
        )}

        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <FontAwesome name="user" size={24} color="#DC2626" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Profile</Text>
              <Text style={styles.actionDescription}>
                Update your account settings
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  roleText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  quickActions: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionContent: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: 'transparent',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});
