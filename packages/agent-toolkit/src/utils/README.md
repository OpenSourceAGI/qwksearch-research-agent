# Provider Image Cropper

Utility for extracting individual provider logos from a sprite sheet.

## Usage

### Basic Usage

```typescript
import { cropProvider, cropProviderAsDataURL, getProviderImage } from 'agent-toolkit';

// Method 1: Load image first, then crop
const img = new Image();
img.src = '/providers-sprite.png';
await img.decode();
const canvas = await cropProvider(img, 'openai');

// Method 2: Get as data URL (for React/Vue components)
const dataUrl = await cropProviderAsDataURL(img, 'anthropic');

// Method 3: Load and crop in one step
const canvas = await getProviderImage('/providers-sprite.png', 'gemini');
```

### React Component Example

```tsx
import { useEffect, useState } from 'react';
import { cropProviderAsDataURL, Provider } from 'agent-toolkit';

function ProviderIcon({ providerType }: { providerType: Provider }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadIcon = async () => {
      const img = new Image();
      img.src = '/providers-sprite.png';
      await img.decode();
      const url = await cropProviderAsDataURL(img, providerType);
      setIconUrl(url);
    };
    loadIcon();
  }, [providerType]);

  return iconUrl ? <img src={iconUrl} alt={providerType} /> : null;
}
```

## Sprite Sheet Layout

The sprite sheet must be organized in a 6×4 grid (6 columns, 4 rows) with the following layout:

| Row 0 | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 |
|-------|-------|-------|-------|-------|-------|-------|
| **0** | openrouter | tongyi | ollama | huggingface | localai | openllm |
| **1** | zhipu | replicate | azure | anthropic | groq | sagemaker |
| **2** | 01ai | bedrock | openai | cohere | together | xorbits |
| **3** | wenxin | moonshot | gemini | mistral | jina | chatglm |

## Available Providers

Use `getProviderNames()` to get all supported providers:

```typescript
import { getProviderNames } from 'agent-toolkit';

const providers = getProviderNames();
// ['openrouter', 'tongyi', 'ollama', 'huggingface', ...]
```

## API Reference

### `cropProvider(image, provider)`
Returns a canvas element with the cropped provider logo.

### `cropProviderAsBlob(image, provider, type?, quality?)`
Returns a Blob of the cropped logo. Useful for file uploads.

### `cropProviderAsDataURL(image, provider, type?, quality?)`
Returns a data URL string. Best for inline images in HTML/React.

### `getProviderImage(spriteSheetUrl, provider)`
Loads the sprite sheet and returns the cropped canvas in one call.

### `getProviderNames()`
Returns an array of all supported provider names.

## Creating a Sprite Sheet

To create a compatible sprite sheet:

1. Collect 24 provider logos (one for each provider)
2. Arrange them in a 6×4 grid following the layout above
3. Ensure all logos are the same size
4. Export as PNG with transparency
5. Save to `public/images/providers-sprite.png`

Recommended tile size: 128×128px or 256×256px per provider.
