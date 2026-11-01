import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';

export interface LogoAnimationProps {
  /** Callback fired once Phase 1-4 intro animation completes (~2.5-2.8s) */
  onAnimationComplete?: () => void;
  /** Whether the current theme is dark */
  isDark?: boolean;
  /** Custom logo size (defaults to 120px) */
  size?: number;
}

const logoSource = require('@/assets/images/spendz-logo.png');

export const LogoAnimation: React.FC<LogoAnimationProps> = ({
  onAnimationComplete,
  isDark = true,
  size = 120,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Shared values for 5-phase choreography
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const rotateZ = useSharedValue(0); // Organic tilt for Phase 2 leaf reveal
  const rotateY = useSharedValue(0); // 3D flip for Phase 3 coin animation
  const translateY = useSharedValue(0); // Subtle floating oscillation for Phase 5 idle

  const notifyComplete = useCallback(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    if (shouldReduceMotion) {
      // Respect accessibility / reduced-motion preferences: instant clean fade without transforms
      opacity.value = withTiming(1, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(notifyComplete)();
        }
      });
      scale.value = withTiming(1, { duration: 300 });
      return;
    }

    // =========================================================================
    // PHASE 1 — INITIAL REVEAL (0 - 500ms)
    // Logo begins at 85% scale, smoothly fades in and scales to 100%.
    // =========================================================================
    opacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });

    scale.value = withSequence(
      withTiming(1.0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      }),
      // =======================================================================
      // PHASE 2 — LEAF REVEAL (500 - 1200ms, duration 700ms)
      // Subtle organic unfolding pulse: 1.0 -> 1.05 -> 1.0
      // =======================================================================
      withTiming(1.05, {
        duration: 350,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(1.0, {
        duration: 350,
        easing: Easing.inOut(Easing.quad),
      }),
      // =======================================================================
      // PHASE 4 — FINAL SETTLE (1900 - 2500ms, duration 600ms)
      // Slight scale bounce overshoot and spring settle into resting state
      // =======================================================================
      withDelay(
        700, // Wait through Phase 3 (coin flip)
        withSequence(
          withTiming(1.025, {
            duration: 250,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(
            1.0,
            {
              damping: 15,
              stiffness: 180,
              mass: 0.8,
            },
            (finished) => {
              if (finished) {
                runOnJS(notifyComplete)();
              }
            }
          )
        )
      )
    );

    // PHASE 2: Rotation tilt for organic leaf unfold (500 - 1200ms)
    rotateZ.value = withDelay(
      500,
      withSequence(
        withTiming(-3.5, {
          duration: 250,
          easing: Easing.out(Easing.sin),
        }),
        withTiming(2.0, {
          duration: 250,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.sin),
        })
      )
    );

    // =========================================================================
    // PHASE 3 — COIN ANIMATION (1200 - 1900ms, duration 700ms)
    // 3D flip effect around vertical Y-axis with perspective, settling smoothly
    // =========================================================================
    rotateY.value = withDelay(
      1200,
      withSequence(
        withTiming(28, {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(-14, {
          duration: 220,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(5, {
          duration: 140,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(0, {
          duration: 100,
          easing: Easing.out(Easing.quad),
        })
      )
    );

    // =========================================================================
    // PHASE 5 — IDLE (2500ms+)
    // Gentle floating loop (±4px) while waiting for application initialization
    // =========================================================================
    translateY.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(-4, {
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(4, {
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
  }, [shouldReduceMotion, notifyComplete, opacity, scale, rotateZ, rotateY, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { perspective: 1000 },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotateZ.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            width: size,
            height: size,
            // Theme-adaptive shadow/contrast:
            // In light mode, subtle neutral shadow ensures the white 'S' pops distinctly
            // In dark mode, subtle emerald glow complements the brand aesthetic
            shadowColor: isDark ? '#05D69E' : '#000000',
            shadowOffset: { width: 0, height: isDark ? 4 : 8 },
            shadowOpacity: isDark ? 0.3 : 0.12,
            shadowRadius: isDark ? 20 : 18,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={logoSource}
          style={[styles.logoImage, { width: size, height: size }]}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Spendz Logo"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  logoImage: {
    // Proportions preserved from original PNG asset
  },
});
