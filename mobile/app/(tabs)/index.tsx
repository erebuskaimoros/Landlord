import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { supabase } from '@/src/lib/supabase/client';

interface DashboardStats {
  total_units: number;
  vacant_units: number;
  total_tenants: number;
  active_leases: number;
  total_transactions: number;
  total_buildings: number;
}

interface TaskCounts {
  open: number;
  overdue: number;
  urgent: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { organization, profile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', organization?.id],
    queryFn: async (): Promise<DashboardStats | null> => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { org_id: organization.id } as any);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!organization?.id,
  });

  // Fetch task counts
  const { data: taskCounts, refetch: refetchTasks } = useQuery({
    queryKey: ['task-counts', organization?.id],
    queryFn: async (): Promise<TaskCounts> => {
      if (!organization?.id) return { open: 0, overdue: 0, urgent: 0 };

      const today = new Date().toISOString().split('T')[0];

      // Get open tasks count
      const { count: openCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .in('status', ['open', 'in_progress']);

      // Get overdue tasks count
      const { count: overdueCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .in('status', ['open', 'in_progress'])
        .lt('due_date', today);

      // Get urgent tasks count
      const { count: urgentCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('priority', 'urgent')
        .in('status', ['open', 'in_progress']);

      return {
        open: openCount || 0,
        overdue: overdueCount || 0,
        urgent: urgentCount || 0,
      };
    },
    enabled: !!organization?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTasks()]);
    setRefreshing(false);
  }, [refetchStats, refetchTasks]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {profile?.full_name?.split(' ')[0] || 'there'}
        </Text>
        <Text style={styles.orgName}>{organization?.name}</Text>
      </View>

      {/* Task Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        <View style={styles.taskCardsRow}>
          <TouchableOpacity
            style={[styles.taskCard, styles.taskCardOpen]}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <FontAwesome name="tasks" size={20} color="#2563eb" />
            <Text style={styles.taskCardNumber}>{taskCounts?.open || 0}</Text>
            <Text style={styles.taskCardLabel}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.taskCard, styles.taskCardOverdue]}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <FontAwesome name="clock-o" size={20} color="#dc2626" />
            <Text style={[styles.taskCardNumber, styles.overdueNumber]}>
              {taskCounts?.overdue || 0}
            </Text>
            <Text style={styles.taskCardLabel}>Overdue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.taskCard, styles.taskCardUrgent]}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <FontAwesome name="exclamation-triangle" size={20} color="#f59e0b" />
            <Text style={[styles.taskCardNumber, styles.urgentNumber]}>
              {taskCounts?.urgent || 0}
            </Text>
            <Text style={styles.taskCardLabel}>Urgent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Property Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Properties</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.total_units || 0}</Text>
            <Text style={styles.statLabel}>Total Units</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.vacant_units || 0}</Text>
            <Text style={styles.statLabel}>Vacant</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.active_leases || 0}</Text>
            <Text style={styles.statLabel}>Active Leases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.total_tenants || 0}</Text>
            <Text style={styles.statLabel}>Tenants</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/camera')}
          >
            <View style={styles.quickActionIcon}>
              <FontAwesome name="camera" size={24} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <View style={styles.quickActionIcon}>
              <FontAwesome name="plus" size={24} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>New Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/units')}
          >
            <View style={styles.quickActionIcon}>
              <FontAwesome name="search" size={24} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>Find Unit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  orgName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  taskCardsRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  taskCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskCardOpen: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  taskCardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  taskCardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  taskCardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  overdueNumber: {
    color: '#dc2626',
  },
  urgentNumber: {
    color: '#f59e0b',
  },
  taskCardLabel: {
    fontSize: 12,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: 'transparent',
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
  },
});
