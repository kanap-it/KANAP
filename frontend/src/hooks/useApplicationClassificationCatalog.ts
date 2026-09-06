import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchApplicationClassificationCatalog } from '../services/itOpsSettings';
import { localizeApplicationClassificationCatalog } from '../utils/applicationClassification';

export function useApplicationClassificationCatalog() {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['application-classification-catalog'],
    queryFn: fetchApplicationClassificationCatalog,
    select: (catalog) => {
      // The language dependency makes React Query re-run select after a locale change;
      // the cached API object remains untouched.
      void i18n.language;
      return localizeApplicationClassificationCatalog(catalog);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default useApplicationClassificationCatalog;
