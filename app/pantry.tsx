import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePantryStore } from '@/stores/pantry.store';
import { logEvent } from '@/lib/behavior-logger';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { PantryItem } from '@/types/domain';

export default function PantryScreen() {
  const { items, isLoading, fetchPantry, addItem, removeItem, markStaple } = usePantryStore();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPantry();
  }, []);

  const handleAdd = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    try {
      await addItem({
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit.trim() || null,
        expiryDate: null,
        isStaple: false,
        isManual: true,
      });
      logEvent('pantry_add');
      setName('');
      setQuantity('');
      setUnit('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    }
  };

  const handleRemove = async (id: string) => {
    await removeItem(id);
    logEvent('pantry_remove');
  };

  const handleToggleStaple = async (item: PantryItem) => {
    await markStaple(item.id, !item.isStaple);
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Loading pantry..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Add Item</Text>
        <TextInput
          style={styles.input}
          placeholder="Item name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Item name"
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            placeholder="Qty"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            accessibilityLabel="Quantity"
          />
          <TextInput
            style={[styles.input, styles.inputSmall]}
            placeholder="Unit"
            value={unit}
            onChangeText={setUnit}
            accessibilityLabel="Unit"
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          label="Add to Pantry"
          accessibilityLabel="Add item to pantry"
          onPress={handleAdd}
          loading={isLoading}
        />
      </Card>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PantryItemRow
            item={item}
            onRemove={() => handleRemove(item.id)}
            onToggleStaple={() => handleToggleStaple(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Your pantry is empty. Add some items to get started!</Text>
        }
      />
    </View>
  );
}

function PantryItemRow({
  item,
  onRemove,
  onToggleStaple,
}: {
  item: PantryItem;
  onRemove: () => void;
  onToggleStaple: () => void;
}) {
  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.isStaple ? <Badge label="Staple" variant="default" /> : null}
      </View>
      {item.quantity !== null ? (
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit ?? ''}
        </Text>
      ) : null}
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={onToggleStaple} accessibilityLabel="Toggle staple">
          <Text style={styles.actionText}>{item.isStaple ? 'Unmark Staple' : 'Mark Staple'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} accessibilityLabel="Remove item">
          <Text style={[styles.actionText, styles.actionTextDanger]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background, padding: Spacing.md },
  formCard: { marginBottom: Spacing.md },
  formTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold as any, color: BrandColors.text, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.muted,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    backgroundColor: BrandColors.surface,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  inputSmall: { flex: 1 },
  errorText: { fontSize: FontSize.sm, color: BrandColors.error, marginBottom: Spacing.sm },
  list: { gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: BrandColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  itemCard: {},
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: BrandColors.text },
  itemQuantity: { fontSize: FontSize.sm, color: BrandColors.textSecondary, marginBottom: Spacing.sm },
  itemActions: { flexDirection: 'row', gap: Spacing.md },
  actionText: { fontSize: FontSize.sm, color: BrandColors.primary },
  actionTextDanger: { color: BrandColors.error },
});
