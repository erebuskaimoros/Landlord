import { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { supabase } from '@/src/lib/supabase/client';
import { Tables } from '@/src/types/database';

type Unit = Tables<'units'>;

const statusColors: Record<string, { bg: string; text: string }> = {
  occupied: { bg: '#dcfce7', text: '#166534' },
  vacant: { bg: '#fef3c7', text: '#92400e' },
  sold: { bg: '#f3f4f6', text: '#374151' },
};

export default function UnitsScreen() {
  const router = useRouter();
  const { organization } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: units, refetch } = useQuery({
    queryKey: ['units', organization?.id],
    queryFn: async (): Promise<Unit[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('organization_id', organization.id)
        .order('address', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const filteredUnits = units?.filter(
    (unit) =>
      unit.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatAddress = (unit: Unit) => {
    let address = unit.address;
    if (unit.unit_number) {
      address += ` #${unit.unit_number}`;
    }
    return address;
  };

  const formatLocation = (unit: Unit) => {
    const parts = [];
    if (unit.city) parts.push(unit.city);
    if (unit.state) parts.push(unit.state);
    if (unit.zip_code) parts.push(unit.zip_code);
    return parts.join(', ');
  };

  const renderUnitItem = ({ item }: { item: Unit }) => {
    const statusStyle = statusColors[item.status] || statusColors.vacant;

    return (
      <TouchableOpacity
        style={styles.unitCard}
        onPress={() => router.push(`/units/${item.id}`)}
      >
        <View style={styles.unitHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          {item.rental_price && (
            <Text style={styles.rentalPrice}>
              ${item.rental_price.toLocaleString()}/mo
            </Text>
          )}
        </View>

        <Text style={styles.unitAddress}>{formatAddress(item)}</Text>
        <Text style={styles.unitLocation}>{formatLocation(item)}</Text>

        <View style={styles.unitDetails}>
          {item.bedrooms !== null && (
            <View style={styles.detailItem}>
              <FontAwesome name="bed" size={12} color="#666" />
              <Text style={styles.detailText}>{item.bedrooms} bed</Text>
            </View>
          )}
          {item.bathrooms !== null && (
            <View style={styles.detailItem}>
              <FontAwesome name="bath" size={12} color="#666" />
              <Text style={styles.detailText}>{item.bathrooms} bath</Text>
            </View>
          )}
          {item.square_footage !== null && (
            <View style={styles.detailItem}>
              <FontAwesome name="expand" size={12} color="#666" />
              <Text style={styles.detailText}>
                {item.square_footage.toLocaleString()} sqft
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
          placeholder="Search by address, city..."
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

      {/* Units List */}
      <FlatList
        data={filteredUnits}
        renderItem={renderUnitItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="building" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No units found</Text>
          </View>
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rentalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  unitAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  unitLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  unitDetails: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'transparent',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  detailText: {
    fontSize: 13,
    color: '#666',
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
});
