import { StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useRouter } from 'expo-router'

import { Text, View } from '@/components/Themed'
import { UnitWithDistance, formatDistance } from '@/src/services/location'

interface NearbyUnitsModalProps {
  visible: boolean
  units: UnitWithDistance[]
  onDismiss: () => void
}

export function NearbyUnitsModal({ visible, units, onDismiss }: NearbyUnitsModalProps) {
  const router = useRouter()

  const handleSelectUnit = (unitId: string) => {
    router.push(`/units/${unitId}`)
    onDismiss()
  }

  const formatUnitAddress = (unit: UnitWithDistance) => {
    let address = unit.address
    if (unit.unit_number) address += ` #${unit.unit_number}`
    return address
  }

  const formatUnitLocation = (unit: UnitWithDistance) => {
    const parts = []
    if (unit.city) parts.push(unit.city)
    if (unit.state) parts.push(unit.state)
    return parts.join(', ')
  }

  if (units.length === 0) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <FontAwesome name="map-marker" size={20} color="#2563eb" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Nearby Units</Text>
              <Text style={styles.subtitle}>
                {units.length} unit{units.length !== 1 ? 's' : ''} detected near your location
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Unit List */}
          <View style={styles.unitList}>
            {units.map((unit) => (
              <TouchableOpacity
                key={unit.id}
                style={styles.unitItem}
                onPress={() => handleSelectUnit(unit.id)}
                activeOpacity={0.7}
              >
                <View style={styles.unitInfo}>
                  <Text style={styles.unitAddress}>{formatUnitAddress(unit)}</Text>
                  <Text style={styles.unitLocation}>{formatUnitLocation(unit)}</Text>
                </View>
                <View style={styles.unitMeta}>
                  <View style={styles.distanceBadge}>
                    <FontAwesome name="location-arrow" size={10} color="#2563eb" />
                    <Text style={styles.distanceText}>{formatDistance(unit.distance)}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>

          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  unitList: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    gap: 12,
  },
  unitInfo: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent',
  },
  unitAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  unitLocation: {
    fontSize: 14,
    color: '#666',
  },
  unitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
  },
  dismissButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
})
