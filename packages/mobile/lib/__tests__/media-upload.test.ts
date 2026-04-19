/**
 * Tests for lib/media-upload.ts
 *
 * Validates: Requirements 11.2, 11.3, 11.4
 */

import { ValidationError } from '../validator';

// ── Mocks ────────────────────────────────────────────────────────
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}));

// Mock fetch + blob for file upload
global.fetch = jest.fn(() =>
  Promise.resolve({ blob: () => Promise.resolve(new Blob(['data'])) } as Response)
);

import { uploadMedia, deleteMedia } from '../media-upload';

const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function makeFile(size: number, type = 'video/mp4', name = 'test.mp4') {
  return { uri: 'file:///test.mp4', name, type, size };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/test.mp4' } });
});

// ── Requirement 11.3: video size limit ───────────────────────────
describe('video file size validation (req 11.3)', () => {
  it('rejects short_video exceeding 100 MB', async () => {
    const file = makeFile(VIDEO_MAX_BYTES + 1);
    await expect(uploadMedia(file, 'post-media', 'short_video')).rejects.toThrow(ValidationError);
  });

  it('accepts short_video exactly at 100 MB', async () => {
    const file = makeFile(VIDEO_MAX_BYTES);
    await expect(uploadMedia(file, 'post-media', 'short_video')).resolves.toBe(
      'https://cdn.example.com/test.mp4'
    );
  });
});

// ── Requirement 11.4: image size limit ───────────────────────────
describe('image file size validation (req 11.4)', () => {
  it('rejects image exceeding 10 MB', async () => {
    const file = makeFile(IMAGE_MAX_BYTES + 1, 'image/jpeg', 'photo.jpg');
    await expect(uploadMedia(file, 'post-media', 'image')).rejects.toThrow(ValidationError);
  });

  it('accepts image exactly at 10 MB', async () => {
    const file = makeFile(IMAGE_MAX_BYTES, 'image/jpeg', 'photo.jpg');
    await expect(uploadMedia(file, 'post-media', 'image')).resolves.toBe(
      'https://cdn.example.com/test.mp4'
    );
  });

  it('rejects recipe_card image exceeding 10 MB', async () => {
    const file = makeFile(IMAGE_MAX_BYTES + 1, 'image/png', 'card.png');
    await expect(uploadMedia(file, 'recipe-media', 'recipe_card')).rejects.toThrow(ValidationError);
  });
});

// ── Requirement 11.2: upload and return public URL ───────────────
describe('upload and public URL (req 11.2)', () => {
  it('uploads to Supabase Storage and returns the public URL', async () => {
    const file = makeFile(1024, 'video/mp4', 'clip.mp4');
    const url = await uploadMedia(file, 'post-media', 'short_video');
    expect(url).toBe('https://cdn.example.com/test.mp4');
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('throws a descriptive error when Supabase upload fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'bucket not found' } });
    const file = makeFile(1024, 'image/jpeg', 'photo.jpg');
    await expect(uploadMedia(file, 'post-media', 'image')).rejects.toThrow('Upload failed: bucket not found');
  });
});

// ── deleteMedia ───────────────────────────────────────────────────
describe('deleteMedia', () => {
  it('removes the file from storage', async () => {
    mockRemove.mockResolvedValue({ error: null });
    await expect(
      deleteMedia('https://project.supabase.co/storage/v1/object/public/post-media/abc.mp4', 'post-media')
    ).resolves.toBeUndefined();
    expect(mockRemove).toHaveBeenCalledWith(['abc.mp4']);
  });

  it('throws a descriptive error when delete fails', async () => {
    mockRemove.mockResolvedValue({ error: { message: 'not found' } });
    await expect(
      deleteMedia('https://project.supabase.co/storage/v1/object/public/post-media/abc.mp4', 'post-media')
    ).rejects.toThrow('Delete failed: not found');
  });
});
