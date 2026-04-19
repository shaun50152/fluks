import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, AnimationDuration } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

const CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', emoji: '🔥' },
  { id: 'healthy', label: '🥗 Healthy', emoji: '🥗' },
  { id: 'quick', label: '⚡ Quick', emoji: '⚡' },
  { id: 'comfort', label: '🍲 Comfort', emoji: '🍲' },
  { id: 'dessert', label: '🍰 Dessert', emoji: '🍰' },
];

const FEATURED_RECIPES = [
  { id: '1', title: 'Avocado Toast Supreme', time: '10 min', category: 'healthy', emoji: '🥑' },
  { id: '2', title: 'Spicy Ramen Bowl', time: '25 min', category: 'comfort', emoji: '🍜' },
  { id: '3', title: 'Berry Smoothie Bowl', time: '5 min', category: 'healthy', emoji: '🫐' },
  { id: '4', title: 'Crispy Chicken Tacos', time: '30 min', category: 'quick', emoji: '🌮' },
  { id: '5', title: 'Chocolate Lava Cake', time: '20 min', category: 'dessert', emoji: '🍫' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.hero}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: AnimationDuration.slow }}
        >
          <Text style={styles.heroTitle}>Explore Recipes</Text>
          <Text style={styles.heroSubtitle}>Discover your next favorite meal</Text>
        </MotiView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: AnimationDuration.normal, delay: 100 }}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </MotiView>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
            {CATEGORIES.map((category, index) => (
              <MotiView
                key={category.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: AnimationDuration.normal,
                  delay: 200 + index * 50,
                }}
              >
                <Pressable
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(selectedCategory === category.id ? null : category.id)
                  }
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label.split(' ')[1]}
                  </Text>
                </Pressable>
              </MotiView>
            ))}
          </ScrollView>
        </View>

        {/* Featured Recipes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured</Text>
          {FEATURED_RECIPES.map((recipe, index) => (
            <MotiView
              key={recipe.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.normal,
                delay: 400 + index * 80,
              }}
            >
              <Card style={styles.recipeCard}>
                <View style={styles.recipeEmoji}>
                  <Text style={styles.recipeEmojiText}>{recipe.emoji}</Text>
                </View>
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeTime}>⏱ {recipe.time}</Text>
                </View>
              </Card>
            </MotiView>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  heroTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  searchInput: {
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
  },
  categoriesRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.text,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recipeEmoji: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeEmojiText: {
    fontSize: 28,
  },
  recipeInfo: {
    flex: 1,
    gap: 4,
  },
  recipeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  recipeTime: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
