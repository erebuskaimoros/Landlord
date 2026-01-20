import { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format, isPast, isToday } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { useOfflineTasks } from '@/src/hooks/useOfflineData';
import { useOfflineStore } from '@/src/store/offline';
import { Tables } from '@/src/types/database';

type Task = Tables<'tasks'>;

type FilterOption = 'all' | 'open' | 'overdue' | 'urgent';

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#dc2626',
};

const statusColors: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#6b7280',
};

export default function TasksScreen() {
  const router = useRouter();
  const { organization } = useAuthStore();
  const { isOnline } = useOfflineStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');

  // Build filter options based on selected filter
  const filterOptions = (() => {
    const today = new Date().toISOString().split('T')[0];
    switch (filter) {
      case 'open':
        return { status: ['open', 'in_progress'] };
      case 'overdue':
        return { status: ['open', 'in_progress'] };
      case 'urgent':
        return { status: ['open', 'in_progress'], priority: 'urgent' };
      default:
        return undefined;
    }
  })();

  // Use offline-first tasks hook
  const { data: tasks, refetch } = useOfflineTasks(organization?.id, filterOptions);

  // Filter overdue tasks client-side (needed since SQLite doesn't have same date comparison)
  const filteredByOverdue = filter === 'overdue' && tasks
    ? tasks.filter(task => {
        if (!task.due_date) return false;
        const today = new Date().toISOString().split('T')[0];
        return task.due_date < today;
      })
    : tasks;

  const filteredTasks = filteredByOverdue?.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isOverdue =
      item.due_date &&
      isPast(new Date(item.due_date)) &&
      !isToday(new Date(item.due_date)) &&
      ['open', 'in_progress'].includes(item.status);

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => router.push(`/tasks/${item.id}`)}
      >
        <View style={styles.taskHeader}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[item.priority] },
            ]}
          >
            <Text style={styles.priorityText}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.taskTitle}>{item.title}</Text>

        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.taskFooter}>
          {item.due_date && (
            <View style={styles.dueDateContainer}>
              <FontAwesome
                name="calendar"
                size={12}
                color={isOverdue ? '#dc2626' : '#666'}
              />
              <Text
                style={[styles.dueDate, isOverdue && styles.overdueDueDate]}
              >
                {format(new Date(item.due_date), 'MMM d, yyyy')}
                {isOverdue && ' (Overdue)'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'open', 'overdue', 'urgent'] as FilterOption[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="check-circle" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No tasks found</Text>
            {!isOnline && (
              <Text style={styles.offlineHint}>You're viewing cached data</Text>
            )}
          </View>
        }
        ListHeaderComponent={
          !isOnline ? (
            <View style={styles.offlineBanner}>
              <FontAwesome name="wifi" size={12} color="#666" />
              <Text style={styles.offlineBannerText}>Offline Mode - Viewing cached data</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: 'transparent',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
  },
  overdueDueDate: {
    color: '#dc2626',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  offlineHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#666',
  },
});
