import { useEffect, useMemo, useState } from 'react';
import { DEPARTMENT_FOLDER_BY_KEY } from './registry';
import { getDiscoveredDepartmentFolders, loadDepartmentImageUrls } from './loader';
import { resolveDepartmentJsonKey } from './resolver';

function emptyImages(): string[] {
  return Array.from({ length: 5 }).map(() => '');
}

export function useDepartmentImages(departmentId: string | null | undefined) {
  const departmentKey: string | null = useMemo(
    () => resolveDepartmentJsonKey(departmentId),
    [departmentId]
  );

  const folderName = useMemo(() => {
    if (!departmentKey) return undefined;

    // Strict folder isolation: use only the registry mapping.
    const mapped = (DEPARTMENT_FOLDER_BY_KEY as Record<string, string | undefined>)[departmentKey];
    if (mapped) return mapped;

    // Future-safe mapping without mixing:
    // Try an exact token containment match between canonical key tokens and a
    // discovered folder name. If we can't confidently match, keep slots empty.
    const tokens = departmentKey
      .toLowerCase()
      .split('_')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!tokens.length) return undefined;

    const discovered = getDiscoveredDepartmentFolders();
    const matched = discovered
      .filter((folder) => {
        const folderLower = folder.toLowerCase();
        return tokens.every((tok) => folderLower.includes(tok));
      })
      .sort((a, b) => a.localeCompare(b));

    // Prevent cross-department mixing in ambiguous cases.
    // Only select when there is a single unambiguous folder match.
    return matched.length === 1 ? matched[0] : undefined;
  }, [departmentKey]);

  const [images, setImages] = useState<string[]>(() => emptyImages());

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!folderName) {
        if (!cancelled) setImages(emptyImages());
        return;
      }
      const urls = await loadDepartmentImageUrls(folderName);
      if (!cancelled) {
        setImages(urls);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [folderName]);

  return {
    images,
    departmentKey,
  };
}

