import { FieldValues, useForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodType } from 'zod';

export default function useZodForm<T extends FieldValues>({ schema, ...props }: { schema: ZodType<T> } & UseFormProps<T>) {
  return useForm<T>({
    // Cast to any to smooth over zod/resolver generic mismatch
    resolver: zodResolver(schema as any) as any,
    mode: 'onChange',
    ...props,
  });
}
