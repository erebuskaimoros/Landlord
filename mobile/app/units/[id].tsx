import { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/src/lib/supabase/client';
import { Tables } from '@/src/types/database';

type Unit = Tables<'units'>;
type Lease = Tables<'leases'>;
type Tenant = Tables<'tenants'>;
type Task = Tables<'tasks'>;

const statusColors: Record<string, { bg: string; text: string }> = {
  occupied: { bg: '#dcfce7', text: '#166534' },
  vacant: { bg: '#fef3c7', text: '#92400e' },
  sold: { bg: '#f3f4f6', text: '#374151' },
};

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch unit details
  const { data: unit, refetch: refetchUnit, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: async (): Promise<Unit | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch active lease
  const { data: lease } = useQuery({
    queryKey: ['lease', unit?.id],
    queryFn: async (): Promise<(Lease & { tenant: Tenant | null }) | null> => {
      if (!unit?.id) return null;
      const { data, error } = await supabase
        .from('leases')
        .select('*, tenant:tenants(*)')
        .eq('unit_id', unit.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as (Lease & { tenant: Tenant | null }) | null;
    },
    enabled: !!unit?.id,
  });

  // Fetch active tasks
  const { data: tasks } = useQuery({
    queryKey: ['unit-tasks', unit?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!unit?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('unit_id', unit.id)
        .in('status', ['open', 'in_progress'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!unit?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchUnit();
    setRefreshing(false);
  }, [refetchUnit]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleText = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!unit) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-circle" size={48} color="#dc2626" />
        <Text style={styles.errorText}>Unit not found</Text>
      </View>
    );
  }

  const statusStyle = statusColors[unit.status] || statusColors.vacant;
  const tenant = lease?.tenant;

  const formatAddress = () => {
    let address = unit.address;
    if (unit.unit_number) address += ` #${unit.unit_number}`;
    return address;
  };

  const formatLocation = () => {
    const parts = [];
    if (unit.city) parts.push(unit.city);
    if (unit.state) parts.push(unit.state);
    if (unit.zip_code) parts.push(unit.zip_code);
    return parts.join(', ');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Unit Details' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.address}>{formatAddress()}</Text>
          <Text style={styles.location}>{formatLocation()}</Text>

          {unit.rental_price && (
            <Text style={styles.rentalPrice}>
              ${unit.rental_price.toLocaleString()}/month
            </Text>
          )}
        </View>

        {/* Property Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Property Details</Text>
          <View style={styles.detailsGrid}>
            {unit.bedrooms !== null && (
              <View style={styles.detailItem}>
                <FontAwesome name="bed" size={16} color="#666" />
                <Text style={styles.detailValue}>{unit.bedrooms}</Text>
                <Text style={styles.detailLabel}>Bedrooms</Text>
              </View>
            )}
            {unit.bathrooms !== null && (
              <View style={styles.detailItem}>
                <FontAwesome name="bath" size={16} color="#666" />
                <Text style={styles.detailValue}>{unit.bathrooms}</Text>
                <Text style={styles.detailLabel}>Bathrooms</Text>
              </View>
            )}
            {unit.square_footage !== null && (
              <View style={styles.detailItem}>
                <FontAwesome name="expand" size={16} color="#666" />
                <Text style={styles.detailValue}>
                  {unit.square_footage.toLocaleString()}
                </Text>
                <Text style={styles.detailLabel}>Sq Ft</Text>
              </View>
            )}
            {unit.year_built !== null && (
              <View style={styles.detailItem}>
                <FontAwesome name="calendar" size={16} color="#666" />
                <Text style={styles.detailValue}>{unit.year_built}</Text>
                <Text style={styles.detailLabel}>Year Built</Text>
              </View>
            )}
          </View>
        </View>

        {/* Current Tenant */}
        {tenant && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Tenant</Text>
            <View style={styles.tenantInfo}>
              <View style={styles.tenantAvatar}>
                <FontAwesome name="user" size={20} color="#666" />
              </View>
              <View style={styles.tenantDetails}>
                <Text style={styles.tenantName}>
                  {tenant.first_name} {tenant.last_name}
                </Text>
                {lease && (
                  <Text style={styles.leaseInfo}>
                    ${lease.rent_amount.toLocaleString()}/mo - Lease ends{' '}
                    {lease.end_date
                      ? format(new Date(lease.end_date), 'MMM d, yyyy')
                      : 'N/A'}
                  </Text>
                )}
              </View>
            </View>

            {/* Contact Buttons */}
            {tenant.phone && (
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCall(tenant.phone!)}
                >
                  <FontAwesome name="phone" size={16} color="#fff" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, styles.contactButtonSecondary]}
                  onPress={() => handleText(tenant.phone!)}
                >
                  <FontAwesome name="comment" size={16} color="#2563eb" />
                  <Text style={[styles.contactButtonText, styles.contactButtonTextSecondary]}>
                    Text
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Open Tasks */}
        {tasks && tasks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open Tasks ({tasks.length})</Text>
            {tasks.slice(0, 3).map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onPress={() => router.push(`/tasks/${task.id}`)}
              >
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={styles.taskDueDate}>
                      Due: {format(new Date(task.due_date), 'MMM d')}
                    </Text>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={14} color="#ccc" />
              </TouchableOpacity>
            ))}
            {tasks.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/tasks')}
              >
                <Text style={styles.viewAllText}>View all tasks</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/camera')}
            >
              <View style={styles.quickActionIcon}>
                <FontAwesome name="camera" size={20} color="#2563eb" />
              </View>
              <Text style={styles.quickActionLabel}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="plus" size={20} color="#2563eb" />
              </View>
              <Text style={styles.quickActionLabel}>New Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="image" size={20} color="#2563eb" />
              </View>
              <Text style={styles.quickActionLabel}>Photos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        {unit.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notes}>{unit.notes}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Created {format(new Date(unit.created_at), 'MMM d, yyyy')}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  location: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  rentalPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: 'transparent',
  },
  detailItem: {
    width: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    gap: 6,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  tenantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  leaseInfo: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
  },
  contactButtonSecondary: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  contactButtonTextSecondary: {
    color: '#2563eb',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  taskInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  taskTitle: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  taskDueDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  viewAllButton: {
    paddingTop: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
  },
  notes: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  metadata: {
    marginTop: 8,
    gap: 4,
    backgroundColor: 'transparent',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
