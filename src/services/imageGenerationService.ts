/**
 * Unified Image Generation Service
 * Supports FLUX.1 Schnell (via Fal.ai) and Imagen 3 (via Google GenAI),
 * with runtime and environment-based toggling.
 */

import { GoogleGenAI } from '@google/genai';

export type ImageProvider = 'flux' | 'imagen';

export interface ImageGenerationConfig {
  provider: ImageProvider;
  activeModel: string;
  hasFalKey: boolean;
  hasGeminiKey: boolean;
  availableProviders: ImageProvider[];
  models: {
    flux: string;
    imagen: string;
  };
}

export interface GenerateImageOptions {
  prompt: string;
  role?: string;
  stepTitle?: string;
  aspectRatio?: '16:9' | '1:1' | '4:3' | '3:4' | '9:16';
  provider?: ImageProvider;
  geminiApiKey?: string;
  falApiKey?: string;
}

export interface GenerateImageResult {
  success: boolean;
  provider: ImageProvider;
  model: string;
  imageUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  seed?: number;
  error?: string;
  originalPrompt: string;
  enhancedPrompt: string;
  durationMs?: number;
}

// In-memory runtime override if toggled dynamically in the app
let runtimeProviderOverride: ImageProvider | null = null;

/**
 * Normalizes and extracts the active Fal API key from environment or request.
 */
export function getFalApiKey(overrideKey?: string): string | undefined {
  const raw = (
    overrideKey ||
    process.env.FAL_KEY ||
    process.env.FAL_API_KEY ||
    process.env.VITE_FAL_KEY ||
    ''
  ).trim();
  const cleaned = raw.replace(/^["']|["']$/g, '').trim();
  return cleaned || undefined;
}

/**
 * Normalizes and extracts the Gemini API key from environment or request.
 */
export function getGeminiApiKey(overrideKey?: string): string | undefined {
  const raw = (
    overrideKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
  const cleaned = raw.replace(/^["']|["']$/g, '').trim();
  return cleaned || undefined;
}

/**
 * Resolves the configured image generation provider.
 * Follows precedence:
 * 1. Runtime override (if toggled via UI)
 * 2. IMAGE_GENERATION_PROVIDER / IMAGE_PROVIDER env var
 * 3. Auto-detection (prefers 'flux' if FAL_KEY exists, otherwise 'imagen' if GEMINI_API_KEY exists)
 * 4. Default: 'flux'
 */
export function getActiveImageProvider(): ImageProvider {
  if (runtimeProviderOverride) {
    return runtimeProviderOverride;
  }

  const envConfig = (
    process.env.IMAGE_GENERATION_PROVIDER ||
    process.env.IMAGE_PROVIDER ||
    ''
  ).toLowerCase().trim();

  if (envConfig.startsWith('imagen') || envConfig === 'google') {
    return 'imagen';
  }
  if (envConfig.startsWith('flux') || envConfig === 'fal') {
    return 'flux';
  }

  // Auto-detection based on available keys
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());

  if (hasFal) return 'flux';
  if (hasGemini) return 'imagen';

  return 'flux';
}

/**
 * Allows switching provider at runtime.
 */
export function setRuntimeImageProvider(provider: ImageProvider | null): void {
  runtimeProviderOverride = provider;
}

/**
 * Returns complete configuration status for UI inspection.
 */
export function getImageGenerationConfig(): ImageGenerationConfig {
  const currentProvider = getActiveImageProvider();
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());

  const fluxModel = process.env.FLUX_MODEL || 'fal-ai/flux/schnell';
  const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';

  const available: ImageProvider[] = [];
  if (hasFal) available.push('flux');
  if (hasGemini) available.push('imagen');
  if (available.length === 0) {
    available.push('flux', 'imagen');
  }

  return {
    provider: currentProvider,
    activeModel: currentProvider === 'flux' ? fluxModel : imagenModel,
    hasFalKey: hasFal,
    hasGeminiKey: hasGemini,
    availableProviders: available,
    models: {
      flux: fluxModel,
      imagen: imagenModel,
    },
  };
}

/**
 * Enhances raw SOP instructions into a rich photographic workplace prompt.
 * Ensures the generated visuals are documentary-style, realistic, and contain zero burnt text.
 */
export function buildEnhancedSOPPrompt(
  prompt: string,
  role?: string,
  stepTitle?: string
): string {
  const roleName = role ? role.trim() : 'professional workplace frontline specialist';
  const actionDescription = prompt.trim();
  const context = stepTitle ? `Action: "${stepTitle}". ` : '';

  return (
    `Documentary photo of a ${roleName} in authentic workplace environment. ` +
    `${context}${actionDescription}. ` +
    `Photorealistic, clear cinematic lighting, natural workplace depth, high resolution 4k, crisp authentic details. ` +
    `Zero burned-in text, zero watermarks, zero logos, natural human posture.`
  );
}

/**
 * Generates an image using FLUX.1 Schnell via Fal.ai.
 */
async function generateWithFluxSchnell(
  enhancedPrompt: string,
  aspectRatio: string,
  falKey?: string
): Promise<{ imageUrl: string; seed?: number }> {
  const resolvedKey = getFalApiKey(falKey);
  if (!resolvedKey) {
    throw new Error(
      'FAL_KEY is not configured on the server. Please set FAL_KEY in your environment to use FLUX.1 Schnell.'
    );
  }

  const model = process.env.FLUX_MODEL || 'fal-ai/flux/schnell';
  const endpoint = `https://fal.run/${model}`;

  // Map aspect ratio to Fal dimension specifications
  let imageSize: any = 'landscape_16_9';
  if (aspectRatio === '1:1') imageSize = 'square_hd';
  else if (aspectRatio === '9:16') imageSize = 'portrait_16_9';
  else if (aspectRatio === '4:3') imageSize = 'landscape_4_3';
  else if (aspectRatio === '3:4') imageSize = 'portrait_4_3';

  const body = {
    prompt: enhancedPrompt,
    image_size: imageSize,
    num_inference_steps: 4, // Schnell optimal steps
    num_images: 1,
    enable_safety_checker: true,
    sync_mode: true,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${resolvedKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'aistudio-flux-service',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.detail || errJson.message || errText;
      } catch {
        errorDetail = errText;
      }
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    throw new Error(`Fal.ai FLUX API returned status ${response.status}: ${errorDetail}`);
  }

  const data = await response.json();
  const images = data.images || [];
  if (!images.length || !images[0]?.url) {
    throw new Error('Fal.ai returned success response but no image URL was found.');
  }

  return {
    imageUrl: images[0].url,
    seed: data.seed,
  };
}

/**
 * Generates an image using Google GenAI (supporting gemini-2.5-flash-image on developer API
 * and imagen-3.0-generate-002 on enterprise Vertex AI).
 */
async function generateWithImagen(
  enhancedPrompt: string,
  aspectRatio: string,
  geminiKey?: string
): Promise<{ imageUrl: string; model: string }> {
  const resolvedKey = getGeminiApiKey(geminiKey);
  if (!resolvedKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY to use Gemini/Imagen.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey: resolvedKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-imagen-service',
      },
    },
  });

  const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';

  // 1. Try gemini-2.5-flash-image via generateContent (supported natively on Google AI Studio API)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `High-resolution documentary workplace photograph, 16:9 widescreen, photorealistic, clear natural lighting: ${enhancedPrompt}`,
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.data);
    if (imagePart?.inlineData?.data) {
      const mime = imagePart.inlineData.mimeType || 'image/png';
      return {
        imageUrl: `data:${mime};base64,${imagePart.inlineData.data}`,
        model: 'gemini-2.5-flash-image',
      };
    }
  } catch (flashErr: any) {
    console.warn('[ImageService] gemini-2.5-flash-image attempt failed, trying generateImages:', flashErr?.message);
  }

  // 2. Try generateImages with imagen-3.0-generate-002 (Vertex AI platform)
  const validRatios: ('1:1' | '3:4' | '4:3' | '9:16' | '16:9')[] = [
    '1:1', '3:4', '4:3', '9:16', '16:9',
  ];
  const mappedRatio = validRatios.includes(aspectRatio as any)
    ? (aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9')
    : '16:9';

  const response: any = await ai.models.generateImages({
    model: imagenModel,
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: mappedRatio,
    },
  });

  const generated = response?.generatedImages?.[0]?.image?.imageBytes;
  if (!generated) {
    throw new Error('Imagen returned success response but no image bytes were found.');
  }

  return {
    imageUrl: `data:image/jpeg;base64,${generated}`,
    model: imagenModel,
  };
}

/**
 * Main entry point: Generates an image using either FLUX.1 Schnell or Imagen,
 * respecting provider overrides, environment toggles, and fallbacks.
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const startTime = Date.now();
  const provider = options.provider || getActiveImageProvider();
  const aspectRatio = options.aspectRatio || '16:9';

  const enhancedPrompt = buildEnhancedSOPPrompt(
    options.prompt,
    options.role,
    options.stepTitle
  );

  const fluxModel = process.env.FLUX_MODEL || 'fal-ai/flux/schnell';
  const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';
  const targetModel = provider === 'flux' ? fluxModel : imagenModel;

  try {
    if (provider === 'flux') {
      const result = await generateWithFluxSchnell(
        enhancedPrompt,
        aspectRatio,
        options.falApiKey
      );
      return {
        success: true,
        provider: 'flux',
        model: targetModel,
        imageUrl: result.imageUrl,
        seed: result.seed,
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime,
      };
    } else {
      const result = await generateWithImagen(
        enhancedPrompt,
        aspectRatio,
        options.geminiApiKey
      );
      return {
        success: true,
        provider: 'imagen',
        model: result.model || targetModel,
        imageUrl: result.imageUrl,
        mimeType: 'image/jpeg',
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime,
      };
    }
  } catch (primaryErr: any) {
    const errorMsg = primaryErr?.message || String(primaryErr);
    console.warn(`[ImageService] Primary provider ${provider} failed (${errorMsg}). Checking fallback options...`);

    // If FLUX failed, automatically fallback to Gemini/Imagen if Gemini key is available
    if (provider === 'flux' && getGeminiApiKey(options.geminiApiKey)) {
      console.warn(`[ImageService] FLUX failed. Seamlessly generating photorealistic visual with Google Gemini/Imagen...`);
      try {
        const fallbackResult = await generateWithImagen(
          enhancedPrompt,
          aspectRatio,
          options.geminiApiKey
        );
        return {
          success: true,
          provider: 'imagen',
          model: fallbackResult.model || imagenModel,
          imageUrl: fallbackResult.imageUrl,
          mimeType: 'image/jpeg',
          originalPrompt: options.prompt,
          enhancedPrompt,
          durationMs: Date.now() - startTime,
        };
      } catch (fallbackErr: any) {
        console.error('[ImageService] Fallback to Gemini/Imagen also failed:', fallbackErr?.message);
      }
    }

    return {
      success: false,
      provider,
      model: targetModel,
      error: errorMsg,
      originalPrompt: options.prompt,
      enhancedPrompt,
      durationMs: Date.now() - startTime,
    };
  }
}
