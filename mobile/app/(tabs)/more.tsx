import { StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { useSettingsStore } from '@/src/store/settings';

export default function MoreScreen() {
  const { signOut, profile, organization, membership, isLoading } = useAuthStore();
  const { autoNavigateEnabled, autoNavigateRadius, setAutoNavigateEnabled } = useSettingsStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    viewer: 'Viewer',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={32} color="#666" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.profileOrg}>{organization?.name}</Text>
          {membership?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {roleLabels[membership.role] || membership.role}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="user-circle" size={20} color="#666" />
            <Text style={styles.menuItemText}>Profile Settings</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="bell" size={20} color="#666" />
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Location Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="map-marker" size={20} color="#666" />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Auto-navigate to nearby units</Text>
              <Text style={styles.menuItemSubtext}>
                Opens unit details when you're at a property ({autoNavigateRadius}m radius)
              </Text>
            </View>
          </View>
          <Switch
            value={autoNavigateEnabled}
            onValueChange={setAutoNavigateEnabled}
            trackColor={{ false: '#e0e0e0', true: '#93c5fd' }}
            thumbColor={autoNavigateEnabled ? '#2563eb' : '#f5f5f5'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="refresh" size={20} color="#666" />
            <Text style={styles.menuItemText}>Sync Status</Text>
          </View>
          <View style={styles.syncStatus}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="database" size={20} color="#666" />
            <Text style={styles.menuItemText}>Clear Cache</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="question-circle" size={20} color="#666" />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <FontAwesome name="info-circle" size={20} color="#666" />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={isLoading}
      >
        <FontAwesome name="sign-out" size={20} color="#dc2626" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>Landlord v1.0.0</Text>
    </ScrollView>
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
    backgroundColor: 'transparent',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  profileOrg: {
    fontSize: 14,
    color: '#666',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  menuItemTextContainer: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#999',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  syncText: {
    fontSize: 14,
    color: '#22c55e',
  },
  signOutButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
});
