import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface CameraScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

// Safely obtain native CameraView and useCameraPermissions hook without crashing Expo Go
let NativeCameraView: any = null;
let useNativeCameraPermissions: (() => [any, () => Promise<any>]) | null = null;
let isNativeCameraModuleAvailable = false;

try {
  const cameraPkg = require('expo-camera');
  if (cameraPkg && (cameraPkg.CameraView || cameraPkg.Camera)) {
    NativeCameraView = cameraPkg.CameraView || cameraPkg.Camera;
    useNativeCameraPermissions = cameraPkg.useCameraPermissions || null;
    isNativeCameraModuleAvailable = true;
  }
} catch (e) {
  // Gracefully handle environments (like some Expo Go builds or web) where native camera isn't linked
  isNativeCameraModuleAvailable = false;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
  const { colors } = useTheme();
  const [hasScanned, setHasScanned] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);

  // Hook into permissions if available
  const nativePermissionsHook = useNativeCameraPermissions ? useNativeCameraPermissions() : null;
  const permissionStatus = nativePermissionsHook ? nativePermissionsHook[0] : null;
  const requestNativePermission = nativePermissionsHook ? nativePermissionsHook[1] : null;

  useEffect(() => {
    if (permissionStatus) {
      setPermissionGranted(Boolean(permissionStatus.granted));
    }
  }, [permissionStatus]);

  const handleRequestPermission = async () => {
    if (requestNativePermission) {
      setRequesting(true);
      try {
        const res = await requestNativePermission();
        setPermissionGranted(Boolean(res?.granted));
        if (!res?.granted && Platform.OS !== 'web') {
          Linking.openSettings().catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to request camera permission:', e);
      } finally {
        setRequesting(false);
      }
    }
  };

  const handleBarcodeScanned = (event: any) => {
    if (hasScanned) return;
    const data = event?.data || event?.raw || '';
    if (data) {
      setHasScanned(true);
      onScan(data);
    }
  };

  // If native camera is unavailable in Expo Go or Web
  if (!isNativeCameraModuleAvailable || !NativeCameraView) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: '#000000' }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.fallbackContent}>
          <View style={[styles.fallbackIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Camera size={44} color="#FFFFFF" strokeWidth={1.8} />
          </View>
          <Text style={styles.fallbackTitle}>Camera Scanner Unavailable</Text>
          <Text style={styles.fallbackSubtitle}>
            Direct camera scanning requires an EAS Development Build or native device camera support.
          </Text>
          <Text style={styles.fallbackInstruction}>
            You can still join any group seamlessly by typing or pasting the invite code into the box.
          </Text>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If permission is not granted yet
  if (permissionGranted === false || (!permissionStatus?.granted && permissionGranted === null)) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: '#000000' }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.fallbackContent}>
          <View style={[styles.fallbackIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <AlertCircle size={44} color={colors.expense} strokeWidth={1.8} />
          </View>
          <Text style={styles.fallbackTitle}>Camera Permission Required</Text>
          <Text style={styles.fallbackSubtitle}>
            Spendz needs camera access to scan group invite QR codes.
          </Text>

          <TouchableOpacity
            onPress={handleRequestPermission}
            disabled={requesting}
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Grant Camera Permission</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.secondaryBtn} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Enter Code Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {/* Top Header */}
      <View style={styles.cameraHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>Scan Group QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraFrameWrapper}>
        <NativeCameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={!hasScanned ? handleBarcodeScanned : undefined}
        />

        {/* Viewfinder Target */}
        <View style={styles.viewfinderOverlay} pointerEvents="none">
          <View style={styles.viewfinderBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.viewfinderInstructions}>
            Point your camera at a Spendz group invite QR.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cameraFooter}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing['2xl'],
  },
  fallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  fallbackIconBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  fallbackTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fallbackInstruction: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing['2xl'],
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    zIndex: 10,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  cameraFrameWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  viewfinderInstructions: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginTop: 24,
    textAlign: 'center',
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing['2xl'],
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  cancelText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
});
