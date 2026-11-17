import { ConfirmButton } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import type { Collection } from '@/domain/types';
import { useRemove } from '@/data/queries';

/** "Excluir" in a form's footer (asks for confirmation first). */
export function DeleteButton({ colecao, id, onDone }: { colecao: Collection; id?: string; onDone: () => void }) {
  const { remove } = useRemove();
  if (!id) return null;
  return (
    <ConfirmButton
      onConfirm={async () => {
        try {
          await remove(colecao, id);
          toast('Excluído');
          onDone();
        } catch {
          /* already reported */
        }
      }}
    >
      Excluir
    </ConfirmButton>
  );
}
