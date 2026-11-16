import { Button, ConfirmButton } from '@/components/ui/Button';
import { SampleChip } from '@/components/ui/Chip';
import { EmptyState, Note, PageHeader, Sub } from '@/components/ui/Layout';
import { DataTable, NameCell, RowActions } from '@/components/ui/Table';
import { toast } from '@/components/ui/toast';
import { useCalc, useRemove } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { dataBR } from '@/lib/dates';
import { fmt } from '@/lib/format';

export default function ProductionPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const { remove } = useRemove();
  const batches = calc.db.producoes.toSorted((a, b) => (b.data || '').localeCompare(a.data || ''));
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'producao' })}>
      Registrar lote
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Produção"
        description="Cada lote impresso ou montado. Registrar um lote soma peças prontas e desconta os insumos pela receita do produto."
        actions={newButton}
      />
      {batches.length ? (
        <>
          <DataTable
            caption="Lotes de produção"
            rows={batches}
            rowKey={b => b.id}
            columns={[
              { header: 'Data', cell: b => dataBR(b.data), className: 'whitespace-nowrap tabular-nums' },
              {
                header: 'Produto',
                cell: b => (
                  <NameCell
                    name={calc.prodById(b.produtoId)?.nome || 'Produto removido'}
                    after={<SampleChip show={b.exemplo} />}
                    sub={b.obs}
                  />
                ),
              },
              { header: 'Peças', numeric: true, cell: b => <b>{fmt(b.qtd, 0)}</b> },
              {
                header: 'Insumos usados',
                cell: b => (
                  <Sub>
                    {(b.consumo || [])
                      .map(c => {
                        const i = calc.insById(c.insumoId);
                        return `${fmt(c.qtd, 3)} ${i?.unidade || ''} ${i?.nome || '?'}`;
                      })
                      .join(' · ') || '—'}
                  </Sub>
                ),
              },
              {
                header: '',
                cell: b => (
                  <RowActions>
                    <ConfirmButton
                      size="sm"
                      onConfirm={async () => {
                        try {
                          await remove('producoes', b.id);
                          toast('Excluído');
                        } catch {
                          /* already reported */
                        }
                      }}
                    >
                      Excluir
                    </ConfirmButton>
                  </RowActions>
                ),
              },
            ]}
          />
          <Note>Excluir um lote devolve os insumos ao estoque e tira as peças prontas.</Note>
        </>
      ) : (
        <EmptyState title="Nenhum lote registrado" action={newButton}>
          Quando imprimir ou montar peças, registre aqui para o estoque de insumos se atualizar sozinho.
        </EmptyState>
      )}
    </>
  );
}
