import { FileTextIcon } from 'lucide-react';

import { createSurfaceSkeleton } from '@/components/Skeleton/Surface';
import { routeMeta } from '@/spa/router/routeMeta';

export const qwkDocsRouteMeta = routeMeta({
  icon: FileTextIcon,
  Skeleton: createSurfaceSkeleton('editor'),
  titleKey: 'navigation.qwkDocs',
});
