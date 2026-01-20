import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { supabase } from '@/src/lib/supabase/client';
import { Tables, Enums } from '@/src/types/database';

type Unit = Tables<'units'>;
type PhotoEventType = Enums<'photo_event_type'>;

const eventTypes: { value: PhotoEventType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
];

export default function CameraScreen() {
  const { organization, user } = useAuthStore();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Photo details
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<PhotoEventType>('general');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Fetch units for selection
  const { data: units } = useQuery({
    queryKey: ['units', organization?.id],
    queryFn: async (): Promise<Unit[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('organization_id', organization.id)
        .order('address');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  // Get current location when photo is captured
  const getCurrentLocation = async () => {
    if (locationPermission) {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
        console.warn('Could not get location:', error);
      }
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        await getCurrentLocation();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await getCurrentLocation();
    }
  };

  const uploadPhoto = async () => {
    if (!capturedImage || !selectedUnit || !organization || !user) {
      Alert.alert('Error', 'Please select a unit before uploading');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileName = `${organization.id}/${selectedUnit.id}/${Date.now()}.jpg`;

      // Read the file and upload
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('unit-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Create photo record in database with geolocation
      const { error: dbError } = await supabase.from('photos').insert({
        organization_id: organization.id,
        unit_id: selectedUnit.id,
        file_path: fileName,
        file_name: fileName.split('/').pop() || 'photo.jpg',
        event_type: selectedEventType,
        caption: caption || null,
        taken_at: new Date().toISOString(),
        uploaded_by: user.id,
        latitude: location?.coords.latitude || null,
        longitude: location?.coords.longitude || null,
      } as any);

      if (dbError) throw dbError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['photos'] });

      Alert.alert('Success', 'Photo uploaded successfully');
      resetState();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setCapturedImage(null);
    setSelectedUnit(null);
    setSelectedEventType('general');
    setCaption('');
    setLocation(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <FontAwesome name="camera" size={48} color="#999" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to capture property photos
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show captured image preview
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.previewContainer}>
          {/* Image Preview - placeholder since we can't show the actual image */}
          <View style={styles.imagePreviewPlaceholder}>
            <FontAwesome name="image" size={48} color="#666" />
            <Text style={styles.imagePreviewText}>Photo captured</Text>
          </View>

          {/* Unit Selection */}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowUnitPicker(true)}
          >
            <Text style={styles.selectButtonLabel}>Unit</Text>
            <Text style={styles.selectButtonValue}>
              {selectedUnit?.address || 'Select a unit'}
            </Text>
            <FontAwesome name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          {/* Event Type Selection */}
          <View style={styles.eventTypeContainer}>
            <Text style={styles.label}>Photo Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.eventTypeRow}>
                {eventTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.eventTypeButton,
                      selectedEventType === type.value && styles.eventTypeButtonActive,
                    ]}
                    onPress={() => setSelectedEventType(type.value)}
                  >
                    <Text
                      style={[
                        styles.eventTypeText,
                        selectedEventType === type.value && styles.eventTypeTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Caption */}
          <View style={styles.captionContainer}>
            <Text style={styles.label}>Caption (optional)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a description..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
            />
          </View>

          {/* Location Info */}
          {location && (
            <View style={styles.locationInfo}>
              <FontAwesome name="map-marker" size={14} color="#666" />
              <Text style={styles.locationText}>
                Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetState}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadButton, (!selectedUnit || isUploading) && styles.uploadButtonDisabled]}
              onPress={uploadPhoto}
              disabled={!selectedUnit || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Unit Picker Modal */}
        <Modal visible={showUnitPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Unit</Text>
                <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                  <FontAwesome name="times" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {units?.map((unit) => (
                  <TouchableOpacity
                    key={unit.id}
                    style={styles.unitOption}
                    onPress={() => {
                      setSelectedUnit(unit);
                      setShowUnitPicker(false);
                    }}
                  >
                    <Text style={styles.unitOptionAddress}>{unit.address}</Text>
                    {unit.unit_number && (
                      <Text style={styles.unitOptionNumber}>#{unit.unit_number}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            >
              <FontAwesome name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <FontAwesome name="image" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'transparent',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  previewContainer: {
    padding: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  imagePreviewPlaceholder: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  imagePreviewText: {
    color: '#666',
    fontSize: 14,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  selectButtonValue: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  eventTypeContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventTypeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  eventTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  eventTypeButtonActive: {
    backgroundColor: '#2563eb',
  },
  eventTypeText: {
    fontSize: 14,
    color: '#666',
  },
  eventTypeTextActive: {
    color: '#fff',
  },
  captionContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  captionInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  uploadButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  unitOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  unitOptionAddress: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  unitOptionNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
