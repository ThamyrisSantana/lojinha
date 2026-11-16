/* One place that opens the side-drawer forms. Any screen calls openForm({kind, id}); the host
   renders that form, and only one is open at a time. Forms load on first use. */
import { createContext, lazy, Suspense, use, useState, type ReactNode } from 'react';
import type { Gasto, Insumo, Tarefa } from '@/domain/types';

export type FormRequest =
  | { kind: 'insumo'; id?: string; preset?: Partial<Insumo> }
  | { kind: 'produto'; id?: string }
  | { kind: 'gasto'; id?: string; preset?: Partial<Gasto> }
  | { kind: 'pedido'; id?: string }
  | { kind: 'producao'; produtoId?: string }
  | { kind: 'tarefa'; id?: string; preset?: Partial<Tarefa> };
export type FormKind = FormRequest['kind'];

const SupplyForm = lazy(() => import('@/features/supplies/SupplyForm'));
const ProductForm = lazy(() => import('@/features/pricing/ProductForm'));
const ExpenseForm = lazy(() => import('@/features/expenses/ExpenseForm'));
const OrderForm = lazy(() => import('@/features/orders/OrderForm'));
const BatchForm = lazy(() => import('@/features/production/BatchForm'));
const TaskForm = lazy(() => import('@/features/tasks/TaskForm'));

const FormContext = createContext<(req: FormRequest) => void>(() => {});
export const useOpenForm = () => use(FormContext);

export function FormHost({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FormRequest | null>(null);
  const close = () => setRequest(null);
  return (
    <FormContext value={setRequest}>
      {children}
      <Suspense>{request && <ActiveForm key={JSON.stringify(request)} request={request} onClose={close} />}</Suspense>
    </FormContext>
  );
}

function ActiveForm({ request: r, onClose }: { request: FormRequest; onClose: () => void }) {
  switch (r.kind) {
    case 'insumo':
      return <SupplyForm id={r.id} preset={r.preset} onClose={onClose} />;
    case 'produto':
      return <ProductForm id={r.id} onClose={onClose} />;
    case 'gasto':
      return <ExpenseForm id={r.id} preset={r.preset} onClose={onClose} />;
    case 'pedido':
      return <OrderForm id={r.id} onClose={onClose} />;
    case 'producao':
      return <BatchForm produtoId={r.produtoId} onClose={onClose} />;
    case 'tarefa':
      return <TaskForm id={r.id} preset={r.preset} onClose={onClose} />;
  }
}

/** Props every form receives. */
export interface FormProps {
  id?: string;
  onClose: () => void;
}
