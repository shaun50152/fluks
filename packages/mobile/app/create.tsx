import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadMedia, deleteMedia } from '@/lib/media-upload';
import { validatePostCaption, validateMediaFile, ValidationError } from '@/lib/validator';
import { logEvent } from '@/lib/behavior-logger';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  Shadow,
} from '@/constants/theme';
import type { PostType } from '@/types/domain';

/**
 * Soft-deletes a post record and removes its media from Storage.
 * Requirements: 11.7
 */
export async function deletePost(
  postId: string,
  authorId: string,
  mediaUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', authorId);

  if (error) throw new Error(error.message);

  if (mediaUrl) {
    await deleteMedia(mediaUrl, 'post-media');
  }
}

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'short_video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'recipe_card', label: 'Recipe Card' },
];

const CAPTION_MAX = 500;

interface RecipeSearchResult {
  id: string;
  title: string;
}

interface SelectedMedia {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export default function CreateScreen() {
  const userId = useAuthStore((s) => s.userId);

  const [postType, setPostType] = useState<PostType>('image');
  const [media, setMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [captionError, setCaptionError] = useState<string | undefined>();

  // recipe_card state
  const [recipeQuery, setRecipeQuery] = useState('');
  const [recipeResults, setRecipeResults] = useState<RecipeSearchResult[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSearchResult | null>(null);
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [recipeMode, setRecipeMode] = useState<'search' | 'new'>('search');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Media picker ────────────────────────────────────────────
  async function pickMedia() {
    const isVideo = postType === 'short_video';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = uri.split('/').pop() ?? `media.${isVideo ? 'mp4' : 'jpg'}`;
    const type = isVideo ? 'video/mp4' : 'image/jpeg';
    const size = asset.fileSize ?? 0;

    try {
      validateMediaFile({ size }, postType);
    } catch (e) {
      if (e instanceof ValidationError) {
        setError(e.message);
        return;
      }
    }

    setMedia({ uri, name, type, size });
    setError(null);
  }

  // ── Caption change ───────────────────────────────────────────
  function handleCaptionChange(text: string) {
    setCaption(text);
    if (text.length > CAPTION_MAX) {
      setCaptionError(`Caption must not exceed ${CAPTION_MAX} characters.`);
    } else {
      setCaptionError(undefined);
    }
  }

  // ── Recipe search ────────────────────────────────────────────
  async function searchRecipes(query: string) {
    setRecipeQuery(query);
    if (query.trim().length < 2) {
      setRecipeResults([]);
      return;
    }
    const { data } = await supabase
      .from('recipes')
      .select('id, title')
      .ilike('title', `%${query}%`)
      .limit(10);
    setRecipeResults((data as RecipeSearchResult[]) ?? []);
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    if (!userId) {
      setError('You must be signed in to create a post.');
      return;
    }

    // Validate caption
    try {
      validatePostCaption(caption);
    } catch (e) {
      if (e instanceof ValidationError) {
        setCaptionError(e.message);
        return;
      }
    }

    // Validate recipe_card requirements
    if (postType === 'recipe_card') {
      const hasRecipe = selectedRecipe || newRecipeTitle.trim().length > 0;
      if (!hasRecipe) {
        setError('Please select an existing recipe or enter a new recipe title.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload media if provided
      let mediaUrl: string | null = null;
      if (media) {
        mediaUrl = await uploadMedia(media, 'post-media', postType);
      }

      // 2. Create inline recipe if needed
      let recipeId: string | null = selectedRecipe?.id ?? null;
      if (postType === 'recipe_card' && !selectedRecipe && newRecipeTitle.trim()) {
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            title: newRecipeTitle.trim(),
            ingredients: [],
            steps: [],
            macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            tags: [],
            cook_time: 0,
            author_id: userId,
          })
          .select('id')
          .single();
        if (recipeError) throw new Error(recipeError.message);
        recipeId = newRecipe.id;
      }

      // 3. Insert post record
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          post_type: postType,
          caption: caption || null,
          media_url: mediaUrl,
          recipe_id: recipeId,
        })
        .select('id')
        .single();

      if (postError) throw new Error(postError.message);

      // 4. Log post_created BehaviorEvent
      logEvent('post_created', post.id);

      // 5. Navigate to post detail
      router.push(`/post/${post.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete post ──────────────────────────────────────────────
  function handleDeletePost(postId: string, mediaUrl: string | null) {
    if (!userId) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId, userId, mediaUrl);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete post.');
          }
        },
      },
    ]);
  }

  if (submitting) {
    return <LoadingSpinner message="Creating post…" />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>New Post</Text>

      {/* Post type selector */}
      <View style={styles.typeRow} accessibilityRole="radiogroup" accessibilityLabel="Post type">
        {POST_TYPES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.typeChip, postType === value && styles.typeChipActive]}
            onPress={() => {
              setPostType(value);
              setMedia(null);
              setError(null);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: postType === value }}
            accessibilityLabel={label}
          >
            <Text style={[styles.typeChipText, postType === value && styles.typeChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Media picker */}
      <View style={styles.section}>
        <Button
          label={media ? 'Change Media' : 'Pick Media'}
          variant="secondary"
          onPress={pickMedia}
          accessibilityLabel={media ? 'Change selected media' : 'Pick media from library'}
        />
        {media ? (
          <Text style={styles.mediaName} numberOfLines={1}>
            {media.name}
          </Text>
        ) : null}
      </View>

      {/* Caption */}
      <View style={styles.section}>
        <Input
          label="Caption"
          accessibilityLabel="Post caption"
          placeholder="What's this about?"
          value={caption}
          onChangeText={handleCaptionChange}
          multiline
          maxLength={CAPTION_MAX + 1} // allow typing to trigger error
          style={styles.captionInput}
          error={captionError}
        />
        <Text
          style={[
            styles.charCount,
            caption.length > CAPTION_MAX && styles.charCountError,
          ]}
          accessibilityLabel={`${caption.length} of ${CAPTION_MAX} characters used`}
        >
          {caption.length}/{CAPTION_MAX}
        </Text>
      </View>

      {/* Recipe card section */}
      {postType === 'recipe_card' ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recipe</Text>

          {/* Mode toggle */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeChip, recipeMode === 'search' && styles.typeChipActive]}
              onPress={() => setRecipeMode('search')}
              accessibilityRole="radio"
              accessibilityState={{ checked: recipeMode === 'search' }}
              accessibilityLabel="Search existing recipes"
            >
              <Text style={[styles.typeChipText, recipeMode === 'search' && styles.typeChipTextActive]}>
                Search
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, recipeMode === 'new' && styles.typeChipActive]}
              onPress={() => setRecipeMode('new')}
              accessibilityRole="radio"
              accessibilityState={{ checked: recipeMode === 'new' }}
              accessibilityLabel="Enter new recipe"
            >
              <Text style={[styles.typeChipText, recipeMode === 'new' && styles.typeChipTextActive]}>
                New Recipe
              </Text>
            </TouchableOpacity>
          </View>

          {recipeMode === 'search' ? (
            <>
              <Input
                label="Search recipes"
                accessibilityLabel="Search recipes by title"
                placeholder="e.g. Chicken Salad"
                value={recipeQuery}
                onChangeText={searchRecipes}
              />
              {recipeResults.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.recipeRow,
                    selectedRecipe?.id === r.id && styles.recipeRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedRecipe(r);
                    setRecipeResults([]);
                    setRecipeQuery(r.title);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select recipe: ${r.title}`}
                  accessibilityState={{ selected: selectedRecipe?.id === r.id }}
                >
                  <Text style={styles.recipeRowText}>{r.title}</Text>
                </TouchableOpacity>
              ))}
              {selectedRecipe ? (
                <Text style={styles.selectedRecipeText}>
                  Selected: {selectedRecipe.title}
                </Text>
              ) : null}
            </>
          ) : (
            <Input
              label="Recipe title"
              accessibilityLabel="New recipe title"
              placeholder="e.g. My Avocado Toast"
              value={newRecipeTitle}
              onChangeText={setNewRecipeTitle}
            />
          )}
        </View>
      ) : null}

      {/* Error */}
      {error ? (
        <ErrorCard
          title="Error"
          message={error}
          onRetry={() => setError(null)}
          retryLabel="Dismiss"
        />
      ) : null}

      {/* Submit */}
      <Button
        label="Post"
        variant="primary"
        onPress={handleSubmit}
        disabled={caption.length > CAPTION_MAX}
        accessibilityLabel="Submit post"
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.text,
  },
  mediaName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  captionInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  charCountError: {
    color: Colors.error,
  },
  recipeRow: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipeRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '22',
  },
  recipeRowText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  selectedRecipeText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: FontWeight.medium as any,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
