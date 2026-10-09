import { FileTextIcon } from 'lucide-react';

import { createSurfaceSkeleton } from '@/components/Skeleton/Surface';
import { routeMeta } from '@/spa/router/routeMeta';

/**
 * Route metadata for the QwkSearch Docs workspace (`/docs`).
 *
 * Defined at the route layer — the same placement as the agent
 * routes' metadata — so the shell router's static import graph never
 * reaches into the QwkSearch feature: loading the LobeHub shell must
 * not require the QwkSearch feature to be present or built. The
 * feature's page modules stay behind the lazy `import()` boundaries
 * in `desktopRouter.shared.tsx`.
 */
export const qwkDocsRouteMeta = routeMeta({
  icon: FileTextIcon,
  Skeleton: createSurfaceSkeleton('editor'),
  titleKey: 'navigation.qwkDocs',
});
