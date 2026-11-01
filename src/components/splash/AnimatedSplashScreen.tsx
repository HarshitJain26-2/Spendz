import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { LogoAnimation } from './LogoAnimation';

export interface AnimatedSplashScreenProps {
  /** Indicates whether backend hydration, DB, fonts and auth have finished initializing */
  isAppReady?: boolean;
  /** Callback fired once splash overlay has fully faded out and unmounted */
  onFinish: () => void;
  /** Callback fired when the custom splash screen is mounted and ready to be displayed */
  onReadyToDisplay?: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isAppReady = true,
  onFinish,
  onReadyToDisplay,
}) => {
  const { colors, isDark } = useTheme();

  const [hasFinished, setHasFinished] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const isTransitioningRef = useRef(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay fade-out animation via Reanimated
  const overlayOpacity = useSharedValue(1);

  const finishSplash = useCallback(() => {
    setHasFinished(true);
    onFinish();
  }, [onFinish]);

  const startFadeOut = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Smooth 350ms fade-out transition into the underlying application
    overlayOpacity.value = withTiming(0, { duration: 350 }, (finished) => {
      if (finished) {
        runOnJS(finishSplash)();
      }
    });
  }, [finishSplash, overlayOpacity]);

  // Signal ready to display on mount to smoothly replace expo-splash-screen
  useEffect(() => {
    // Notify native splash that code-based splash is ready to be revealed
    onReadyToDisplay?.();

    // Safety timeout: Ensure splash screen dismisses even if an async resource hangs
    safetyTimeoutRef.current = setTimeout(() => {
      setAnimationCompleted(true);
      if (isAppReady) {
        startFadeOut();
      }
    }, 4500);

    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, [onReadyToDisplay, isAppReady, startFadeOut]);

  // When 5-phase logo animation completes and the app data/auth is ready, fade out smoothly
  useEffect(() => {
    if (animationCompleted && isAppReady) {
      startFadeOut();
    }
  }, [animationCompleted, isAppReady, startFadeOut]);

  const handleAnimationComplete = useCallback(() => {
    setAnimationCompleted(true);
  }, []);

  const handleTapToSkip = () => {
    setAnimationCompleted(true);
    if (isAppReady) {
      startFadeOut();
    }
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

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
        },
        overlayAnimatedStyle,
      ]}
      pointerEvents={hasFinished ? 'none' : 'auto'}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTapToSkip}
        style={styles.touchableContainer}
        accessible={false}
      >
        <LogoAnimation
          onAnimationComplete={handleAnimationComplete}
          isDark={isDark}
          size={120}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
    elevation: Platform.OS === 'android' ? 99999 : undefined,
  },
  touchableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});
