import { createHash, randomBytes } from 'node:crypto';
import cloudinaryPkg from 'cloudinary';

const { v2: cloudinary } = cloudinaryPkg;

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_UPLOAD_FILES = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FOLDER_BY_CATEGORY = {
  shirts: 'SHIRTS', shirt: 'SHIRTS',
  pants: 'PANTS', pant: 'PANTS', jeans: 'PANTS', cargos: 'PANTS', cargo: 'PANTS',
  tshirts: 'TSHIRTS', tees: 'TSHIRTS',
  trackpants: 'TRACK_PANTS',
  shorts: 'SHORTS', hoodies: 'HOODIES', hoodie: 'HOODIES',
  shoes: 'SHOES', watches: 'WATCHES', accessories: 'ACCESSORIES',
};

const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function folderForCategory(category) {
  return FOLDER_BY_CATEGORY[normalise(category)] || 'ACCESSORIES';
}

export function productFolder(category) {
  return `SPIDY_CLOTHING/PRODUCTS/${folderForCategory(category)}`;
}

export function resolveCloudinaryConfig(env = process.env) {
  const config = {};
  if (env.CLOUDINARY_URL) {
    try {
      const parsed = new URL(env.CLOUDINARY_URL);
      config.cloud_name = parsed.hostname;
      config.api_key = decodeURIComponent(parsed.username);
      config.api_secret = decodeURIComponent(parsed.password);
    } catch {
      /* ignore a malformed URL; explicit vars below can still win */
    }
  }
  if (env.CLOUDINARY_CLOUD_NAME) config.cloud_name = env.CLOUDINARY_CLOUD_NAME;
  if (env.CLOUDINARY_API_KEY) config.api_key = env.CLOUDINARY_API_KEY;
  if (env.CLOUDINARY_API_SECRET) config.api_secret = env.CLOUDINARY_API_SECRET;
  if (!config.cloud_name || !config.api_key || !config.api_secret) return null;
  return config;
}

export function cloudinaryEnabled(env = process.env) {
  return Boolean(resolveCloudinaryConfig(env));
}

function configure(env) {
  const config = resolveCloudinaryConfig(env);
  if (!config) {
    throw Object.assign(new Error('Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'), { status: 503 });
  }
  cloudinary.config({ ...config, secure: true });
  return config;
}

export function checksumOf(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function isSupportedImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const b = buffer;
  return (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    || b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP');
}

function safePublicId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9/_-]/g, '-').slice(0, 200);
}

/**
 * Uploads one product image. The stored asset is capped at 1200x1200 and the
 * public id embeds the product (or a draft token) plus a random suffix so two
 * products can never overwrite each other's files.
 */
export async function uploadProductImage(buffer, { env = process.env, category = '', productId = '' } = {}) {
  configure(env);
  const folder = productFolder(category);
  const owner = productId ? String(productId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) : 'draft';
  const publicId = safePublicId(`${folder}/${owner}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`);
  const checksum = checksumOf(buffer);

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: publicId,
      resource_type: 'image',
      format: 'webp',
      overwrite: false,
      unique_filename: false,
      invalidate: true,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'webp' }
      ],
    }, (error, response) => (error ? reject(error) : resolve(response)));
    stream.end(buffer);
  });

  return {
    publicId: result.public_id,
    url: result.secure_url,
    checksum,
    width: Number(result.width) || null,
    height: Number(result.height) || null,
    bytes: Number(result.bytes) || buffer.length,
    format: result.format || 'webp',
  };
}

/** Best-effort delete; only assets created by this app may be removed. */
export async function destroyProductImage(env, publicId) {
  const id = String(publicId || '').trim();
  if (!id) return 'skipped';
  if (!id.startsWith('SPIDY_CLOTHING/') && !id.startsWith('spidy/')) {
    const error = new Error('That image does not belong to this store.');
    error.status = 400;
    throw error;
  }
  configure(env);
  const result = await cloudinary.uploader.destroy(id, { resource_type: 'image', invalidate: true });
  return result.result;
}

/** Inserts a Cloudinary delivery transform without stacking duplicates. */
export function deliveryUrl(url, transform) {
  const source = String(url || '');
  if (!source.includes('/image/upload/')) return source;
  if (!transform) return source;
  // If the URL already has a transformation segment right after /image/upload/
  if (source.includes('/image/upload/c_') || source.includes('/image/upload/f_') || source.includes('/image/upload/w_')) {
    return source.replace(/\/image\/upload\/[^/]+\//, `/image/upload/${transform}/`);
  }
  return source.replace('/image/upload/', `/image/upload/${transform}/`);
}

export function thumbnailUrl(url) {
  return deliveryUrl(url, 'c_fill,w_400,h_500,q_auto,f_webp');
}

export function cardUrl(url) {
  return deliveryUrl(url, 'c_limit,w_800,q_auto,f_webp');
}

export function galleryUrl(url) {
  return deliveryUrl(url, 'c_limit,w_1200,q_auto,f_webp');
}

export async function pingCloudinary(env = process.env) {
  const config = resolveCloudinaryConfig(env);
  if (!config) return { connected: false, reason: 'missing_config' };
  try {
    configure(env);
    const res = await cloudinary.api.ping();
    return { connected: res.status === 'ok', cloudName: config.cloud_name };
  } catch (e) {
    return { connected: false, error: e.message, cloudName: config.cloud_name };
  }
}
