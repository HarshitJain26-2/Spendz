import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedSplashScreenProps {
  isAppReady?: boolean;
  onFinish: () => void;
  onReadyToDisplay?: () => void;
}

// Statically require the video asset from the project assets directory
const splashVideoSource = require('@/assets/videos/spendz-splash-animation.mp4');

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isAppReady = true,
  onFinish,
  onReadyToDisplay,
}) => {
  const { colors } = useTheme();

  const [hasFinished, setHasFinished] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);

  // Initialize expo-video player instance
  const player = useVideoPlayer(splashVideoSource, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  const startFadeOut = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Smooth fade-out transition into the underlying application
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setHasFinished(true);
      onFinish();
    });
  }, [fadeAnim, onFinish]);

  // When video has ended and the underlying app data is ready, initiate smooth fade-out
  useEffect(() => {
    if (videoEnded && isAppReady) {
      startFadeOut();
    }
  }, [videoEnded, isAppReady, startFadeOut]);

  useEffect(() => {
    // 1. Listen for video completion
    const playToEndSub = player.addListener('playToEnd', () => {
      setVideoEnded(true);
    });

    // 2. Listen for player readiness and errors
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        onReadyToDisplay?.();
      }
      if (error) {
        console.warn('[Spendz SplashScreen] Video playback error encountered:', error);
        setVideoEnded(true);
      }
    });

    // 3. Fallback safety timer: video is ~10s. If anything delays playToEnd,
    // ensure transition initiates so the user is never stuck.
    timeoutRef.current = setTimeout(() => {
      setVideoEnded(true);
    }, 10500);

    return () => {
      playToEndSub.remove();
      statusSub.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [player, onReadyToDisplay]);

  const handleTapToSkip = () => {
    if (isAppReady) {
      startFadeOut();
    } else {
      setVideoEnded(true);
    }
  };

  if (hasFinished) {
    return null;
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        {
          backgroundColor: colors.background,
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTapToSkip}
        style={styles.touchableContainer}
      >
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
          style={styles.videoView}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
    elevation: 99999,
  },
  touchableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
});
