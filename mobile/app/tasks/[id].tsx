import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format, isPast, isToday } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/src/store/auth';
import { useOfflineStore } from '@/src/store/offline';
import { useOfflineTask, useOfflineUnit, useOfflineContractor } from '@/src/hooks/useOfflineData';
import { addToSyncQueue } from '@/src/lib/offline';
import { supabase } from '@/src/lib/supabase/client';
import { Tables } from '@/src/types/database';

type Task = Tables<'tasks'>;
type Unit = Tables<'units'>;
type Contractor = Tables<'contractors'>;
type Photo = Tables<'photos'>;

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

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization, user } = useAuthStore();
  const { isOnline, refreshPendingCount } = useOfflineStore();
  const [refreshing, setRefreshing] = useState(false);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Fetch task details with offline support
  const { data: task, refetch: refetchTask, isLoading } = useOfflineTask(id);

  // Fetch unit details with offline support
  const { data: unit } = useOfflineUnit(task?.unit_id);

  // Fetch contractor details with offline support
  const { data: contractor } = useOfflineContractor(task?.assigned_contractor_id ?? undefined);

  // Fetch photos for this task
  const { data: photos, refetch: refetchPhotos } = useQuery({
    queryKey: ['task-photos', id],
    queryFn: async (): Promise<Photo[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && isOnline,
  });

  // Get signed URLs for photos
  const getPhotoUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('unit-photos')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl || null;
  };

  // Update task status mutation with offline support
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!task) return;

      const updates: Partial<Task> = {
        status: newStatus as Task['status'],
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user?.id || null;
      }

      if (isOnline) {
        // Try online update first
        try {
          const { error } = await (supabase
            .from('tasks') as any)
            .update(updates)
            .eq('id', task.id);

          if (error) throw error;
        } catch (error) {
          // If online fails, queue for later
          console.log('[TaskDetail] Online update failed, queuing');
          await addToSyncQueue('UPDATE', 'tasks', task.id, { ...task, ...updates });
          await refreshPendingCount();
        }
      } else {
        // Offline - queue the update
        console.log('[TaskDetail] Offline, queuing update');
        await addToSyncQueue('UPDATE', 'tasks', task.id, { ...task, ...updates });
        await refreshPendingCount();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });

      if (!isOnline) {
        Alert.alert('Queued', 'Status change will sync when you\'re back online');
      }
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update task status');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTask(), refetchPhotos()]);
    setRefreshing(false);
  }, [refetchTask, refetchPhotos]);

  // Take photo with camera
  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        await uploadPhoto(photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  // Upload photo to task
  const uploadPhoto = async (imageUri: string) => {
    if (!task || !organization || !user) return;

    setIsUploading(true);
    setShowCamera(false);

    try {
      // Get location
      let location: Location.LocationObject | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          location = await Location.getCurrentPositionAsync({});
        }
      } catch (e) {
        console.warn('Could not get location:', e);
      }

      // Generate unique filename
      const fileName = `${organization.id}/${task.unit_id}/${Date.now()}.jpg`;

      // Upload to storage
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('unit-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Create photo record linked to task
      const { error: dbError } = await supabase.from('photos').insert({
        organization_id: organization.id,
        unit_id: task.unit_id,
        task_id: task.id,
        file_path: fileName,
        file_name: fileName.split('/').pop() || 'photo.jpg',
        event_type: 'maintenance',
        caption: `Photo for: ${task.title}`,
        taken_at: new Date().toISOString(),
        uploaded_by: user.id,
        latitude: location?.coords.latitude || null,
        longitude: location?.coords.longitude || null,
      } as any);

      if (dbError) throw dbError;

      // Refresh photos
      await refetchPhotos();
      Alert.alert('Success', 'Photo added to task');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  // Open camera modal
  const handleAddPhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleText = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleStatusChange = (newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Change status to "${newStatus.replace('_', ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateStatusMutation.mutate(newStatus),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-circle" size={48} color="#dc2626" />
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const isOverdue =
    task.due_date &&
    isPast(new Date(task.due_date)) &&
    !isToday(new Date(task.due_date)) &&
    ['open', 'in_progress'].includes(task.status);

  return (
    <>
      <Stack.Screen options={{ title: 'Task Details' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColors[task.priority] },
              ]}
            >
              <Text style={styles.badgeText}>{task.priority.toUpperCase()}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[task.status] },
              ]}
            >
              <Text style={styles.badgeText}>
                {task.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
        </View>

        {/* Due Date */}
        {task.due_date && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Due Date</Text>
            <View style={styles.dueDateRow}>
              <FontAwesome
                name="calendar"
                size={16}
                color={isOverdue ? '#dc2626' : '#666'}
              />
              <Text style={[styles.dueDate, isOverdue && styles.overdue]}>
                {format(new Date(task.due_date), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            {isOverdue && (
              <Text style={styles.overdueWarning}>This task is overdue</Text>
            )}
          </View>
        )}

        {/* Unit Info */}
        {unit && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/units/${unit.id}`)}
          >
            <Text style={styles.cardTitle}>Property</Text>
            <View style={styles.unitInfo}>
              <FontAwesome name="building" size={16} color="#666" />
              <View style={styles.unitDetails}>
                <Text style={styles.unitAddress}>{unit.address}</Text>
                {unit.unit_number && (
                  <Text style={styles.unitNumber}>#{unit.unit_number}</Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={16} color="#ccc" />
            </View>
          </TouchableOpacity>
        )}

        {/* Contractor Info */}
        {contractor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Contractor</Text>
            <View style={styles.contractorInfo}>
              <View style={styles.contractorAvatar}>
                <FontAwesome name="user" size={20} color="#666" />
              </View>
              <View style={styles.contractorDetails}>
                <Text style={styles.contractorName}>{contractor.name}</Text>
                {contractor.service_types && contractor.service_types.length > 0 && (
                  <Text style={styles.contractorServices}>
                    {contractor.service_types.join(', ')}
                  </Text>
                )}
              </View>
            </View>

            {/* Contact Buttons */}
            {contractor.phone && (
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCall(contractor.phone!)}
                >
                  <FontAwesome name="phone" size={16} color="#fff" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, styles.contactButtonSecondary]}
                  onPress={() => handleText(contractor.phone!)}
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

        {/* Cost Info */}
        {(task.estimated_cost || task.actual_cost) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cost</Text>
            <View style={styles.costRow}>
              {task.estimated_cost && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Estimated</Text>
                  <Text style={styles.costValue}>
                    ${task.estimated_cost.toLocaleString()}
                  </Text>
                </View>
              )}
              {task.actual_cost && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Actual</Text>
                  <Text style={styles.costValue}>
                    ${task.actual_cost.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {task.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notes}>{task.notes}</Text>
          </View>
        )}

        {/* Photos Section */}
        <View style={styles.card}>
          <View style={styles.photosHeader}>
            <Text style={styles.cardTitle}>Photos</Text>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <>
                  <FontAwesome name="camera" size={14} color="#2563eb" />
                  <Text style={styles.addPhotoText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {photos && photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScroll}
            >
              {photos.map((photo) => (
                <PhotoThumbnail key={photo.id} photo={photo} getPhotoUrl={getPhotoUrl} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotos}>
              <FontAwesome name="image" size={32} color="#ccc" />
              <Text style={styles.noPhotosText}>No photos yet</Text>
              <Text style={styles.noPhotosSubtext}>
                Tap "Add" to attach before/after photos
              </Text>
            </View>
          )}
        </View>

        {/* Status Actions */}
        {['open', 'in_progress'].includes(task.status) && (
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Update Status</Text>
            <View style={styles.actionButtons}>
              {task.status === 'open' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => handleStatusChange('in_progress')}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <FontAwesome name="play" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Start Work</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {task.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSuccess]}
                  onPress={() => handleStatusChange('completed')}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <FontAwesome name="check" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => handleStatusChange('cancelled')}
                disabled={updateStatusMutation.isPending}
              >
                <FontAwesome name="times" size={14} color="#dc2626" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Created {format(new Date(task.created_at), 'MMM d, yyyy')}
          </Text>
          {task.completed_at && (
            <Text style={styles.metadataText}>
              Completed {format(new Date(task.completed_at), 'MMM d, yyyy')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
            <View style={styles.cameraOverlay}>
              {/* Top controls */}
              <View style={styles.cameraTopControls}>
                <TouchableOpacity
                  style={styles.cameraCloseButton}
                  onPress={() => setShowCamera(false)}
                >
                  <FontAwesome name="times" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraFlipButton}
                  onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                >
                  <FontAwesome name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Bottom controls */}
              <View style={styles.cameraBottomControls}>
                <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                  <FontAwesome name="image" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <View style={styles.cameraPlaceholder} />
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </>
  );
}

// Photo thumbnail component
function PhotoThumbnail({
  photo,
  getPhotoUrl,
}: {
  photo: Photo;
  getPhotoUrl: (path: string) => Promise<string | null>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load image URL on mount
  useEffect(() => {
    getPhotoUrl(photo.file_path).then((url) => {
      setImageUrl(url);
      setLoading(false);
    });
  }, [photo.file_path]);

  return (
    <View style={styles.photoThumbnail}>
      {loading ? (
        <View style={styles.photoPlaceholder}>
          <ActivityIndicator size="small" color="#ccc" />
        </View>
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.photoImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <FontAwesome name="image" size={24} color="#ccc" />
        </View>
      )}
      {photo.caption && (
        <Text style={styles.photoCaption} numberOfLines={1}>
          {photo.caption}
        </Text>
      )}
    </View>
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
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
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
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  dueDate: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  overdue: {
    color: '#dc2626',
  },
  overdueWarning: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 8,
    fontWeight: '500',
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  unitDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unitAddress: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  unitNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  contractorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  contractorServices: {
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
  costRow: {
    flexDirection: 'row',
    gap: 24,
    backgroundColor: 'transparent',
  },
  costItem: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  costLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  costValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  notes: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  actionsCard: {
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#2563eb',
  },
  actionButtonSuccess: {
    backgroundColor: '#22c55e',
  },
  actionButtonDanger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextDanger: {
    color: '#dc2626',
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
  // Photos section styles
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  photosScroll: {
    gap: 12,
  },
  photoThumbnail: {
    width: 100,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaption: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  noPhotos: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: 'transparent',
  },
  noPhotosText: {
    fontSize: 14,
    color: '#666',
  },
  noPhotosSubtext: {
    fontSize: 12,
    color: '#999',
  },
  // Camera modal styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  cameraTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'transparent',
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomControls: {
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
  cameraPlaceholder: {
    width: 44,
    height: 44,
  },
});
